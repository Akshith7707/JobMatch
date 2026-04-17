const pool = require('../db/pool');
const { cosineSimilarity, getEmbedding } = require('./aiClient');
const { profileAgent } = require('./profileAgent');
const { jobParsingAgent } = require('./jobParsingAgent');

const matchingAgent = {
  async computeMatchScore(candidate, job, weights) {
    const skillScore = this.computeSkillScore(candidate, job);
    const experienceScore = this.computeExperienceScore(candidate, job);
    const projectScore = this.computeProjectScore(candidate, job);
    let embeddingScore = 0;

    if (candidate.skill_embedding && job.job_embedding) {
      try {
        const candEmb = JSON.parse(candidate.skill_embedding);
        const jobEmb = JSON.parse(job.job_embedding);
        embeddingScore = cosineSimilarity(candEmb, jobEmb) * 100;
      } catch {
        embeddingScore = 0;
      }
    }

    const w = weights || { skill_weight: 0.4, experience_weight: 0.25, project_weight: 0.2, culture_weight: 0.15 };

    const rawScore =
      skillScore * parseFloat(w.skill_weight) +
      experienceScore * parseFloat(w.experience_weight) +
      projectScore * parseFloat(w.project_weight) +
      embeddingScore * parseFloat(w.culture_weight);

    const matchScore = Math.min(Math.round(rawScore * 100) / 100, 100);

    const reasons = [];
    if (skillScore > 70) reasons.push('Strong skill alignment');
    if (experienceScore > 80) reasons.push('Experience level matches well');
    if (projectScore > 60) reasons.push('Relevant project experience');
    if (embeddingScore > 70) reasons.push('High semantic profile match');
    if (reasons.length === 0) reasons.push('Partial match based on available data');

    return {
      match_score: matchScore,
      skill_score: Math.round(skillScore * 100) / 100,
      experience_score: Math.round(experienceScore * 100) / 100,
      project_score: Math.round(projectScore * 100) / 100,
      match_reasons: reasons,
      detailed_breakdown: {
        skill_score: skillScore,
        experience_score: experienceScore,
        project_score: projectScore,
        embedding_score: embeddingScore,
        weights_used: w,
      },
    };
  },

  computeSkillScore(candidate, job) {
    const candidateSkills = (candidate.skills || []).map(s =>
      (typeof s === 'string' ? s : s.name).toLowerCase()
    );
    const candidateTech = (candidate.tech_stack || []).map(t => t.toLowerCase());
    const allCandidateSkills = [...new Set([...candidateSkills, ...candidateTech])];

    let requiredSkills = (job.required_skills || []).map(s =>
      (typeof s === 'string' ? s : s.name).toLowerCase()
    );
    const preferredSkills = (job.preferred_skills || []).map(s =>
      (typeof s === 'string' ? s : s.name).toLowerCase()
    );

    // Fallback: use tags + title keywords when required_skills is empty (unprocessed scraped jobs)
    if (requiredSkills.length === 0) {
      const tags = (job.tags || []).map(t => (typeof t === 'string' ? t : '').toLowerCase()).filter(Boolean);
      const titleWords = (job.title || '').toLowerCase()
        .split(/[\s,\/\-\(\)]+/)
        .filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'senior', 'junior', 'lead', 'staff', 'engineer', 'developer', 'manager', 'remote'].includes(w));
      requiredSkills = [...new Set([...tags, ...titleWords])];
    }

    if (requiredSkills.length === 0) return 30;

    const requiredMatches = requiredSkills.filter(rs =>
      allCandidateSkills.some(cs => cs.includes(rs) || rs.includes(cs))
    ).length;

    const preferredMatches = preferredSkills.filter(ps =>
      allCandidateSkills.some(cs => cs.includes(ps) || ps.includes(cs))
    ).length;

    const requiredScore = (requiredMatches / requiredSkills.length) * 80;
    const preferredScore = preferredSkills.length > 0
      ? (preferredMatches / preferredSkills.length) * 20
      : 20;

    return requiredScore + preferredScore;
  },

  computeExperienceScore(candidate, job) {
    const years = parseFloat(candidate.experience_years) || 0;
    const minYears = parseFloat(job.experience_min) || 0;
    const maxYears = parseFloat(job.experience_max) || minYears + 5;

    if (years >= minYears && years <= maxYears) return 100;
    if (years < minYears) {
      const gap = minYears - years;
      return Math.max(0, 100 - gap * 20);
    }
    const excess = years - maxYears;
    return Math.max(50, 100 - excess * 10);
  },

  computeProjectScore(candidate, job) {
    const complexity = parseFloat(candidate.project_complexity_score) || 5;
    const githubStats = candidate.github_stats || {};

    let score = complexity * 10;

    const candidateLangs = (githubStats.primary_languages || []).map(l => l.toLowerCase());
    const jobText = `${job.title || ''} ${(job.tags || []).join(' ')} ${(job.required_skills || []).map(s => typeof s === 'string' ? s : s.name).join(' ')}`.toLowerCase();

    const langOverlap = candidateLangs.filter(l => jobText.includes(l)).length;

    if (langOverlap > 0) score += 20;
    if (githubStats.public_repos > 10) score += 10;
    if (githubStats.followers > 5) score += 5;

    return Math.min(score, 100);
  },

  async matchJobToCandidates(jobId) {
    const jobResult = await pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    if (jobResult.rows.length === 0) throw new Error('Job not found');
    const job = jobResult.rows[0];

    if (!job.job_embedding) {
      await jobParsingAgent.generateEmbedding(jobId);
      const refreshed = await pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
      Object.assign(job, refreshed.rows[0]);
    }

    const candidates = await pool.query(
      'SELECT * FROM candidates WHERE profile_complete = true'
    );

    const weightResult = await pool.query(
      'SELECT * FROM match_weights WHERE active = true ORDER BY version DESC LIMIT 1'
    );
    const weights = weightResult.rows[0];

    const matches = [];

    for (const candidate of candidates.rows) {
      if (!candidate.skill_embedding) {
        try {
          await profileAgent.generateEmbedding(candidate.id);
          const refreshed = await pool.query('SELECT * FROM candidates WHERE id = $1', [candidate.id]);
          Object.assign(candidate, refreshed.rows[0]);
        } catch (err) {
          console.log('Embedding skipped for candidate (will match without it):', err.message);
        }
      }

      const result = await this.computeMatchScore(candidate, job, weights);

      if (result.match_score > 20) {
        await pool.query(
          `INSERT INTO matches (candidate_id, job_id, match_score, skill_score, experience_score, 
            project_score, match_reasons, detailed_breakdown)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (candidate_id, job_id) 
           DO UPDATE SET match_score = $3, skill_score = $4, experience_score = $5, 
             project_score = $6, match_reasons = $7, detailed_breakdown = $8, updated_at = NOW()`,
          [
            candidate.id, jobId, result.match_score, result.skill_score,
            result.experience_score, result.project_score,
            JSON.stringify(result.match_reasons),
            JSON.stringify(result.detailed_breakdown),
          ]
        );

        matches.push({
          candidate_id: candidate.id,
          job_id: jobId,
          ...result,
        });
      }
    }

    return matches.sort((a, b) => b.match_score - a.match_score);
  },

  async matchCandidateToJobs(candidateId) {
    const candResult = await pool.query('SELECT * FROM candidates WHERE id = $1', [candidateId]);
    if (candResult.rows.length === 0) throw new Error('Candidate not found');
    const candidate = candResult.rows[0];

    if (!candidate.skill_embedding) {
      try {
        await profileAgent.generateEmbedding(candidateId);
        const refreshed = await pool.query('SELECT * FROM candidates WHERE id = $1', [candidateId]);
        Object.assign(candidate, refreshed.rows[0]);
      } catch (err) {
        console.log('Embedding skipped for candidate (will match without it):', err.message);
      }
    }

    const jobs = await pool.query("SELECT * FROM jobs WHERE status = 'active'");

    const weightResult = await pool.query(
      'SELECT * FROM match_weights WHERE active = true ORDER BY version DESC LIMIT 1'
    );
    const weights = weightResult.rows[0];

    const matches = [];

    for (const job of jobs.rows) {
      if (!job.job_embedding) {
        try {
          await jobParsingAgent.generateEmbedding(job.id);
          const refreshed = await pool.query('SELECT * FROM jobs WHERE id = $1', [job.id]);
          Object.assign(job, refreshed.rows[0]);
        } catch (err) {
          console.log('Embedding skipped for job (will match without it):', err.message);
        }
      }

      const result = await this.computeMatchScore(candidate, job, weights);

      if (result.match_score > 20) {
        await pool.query(
          `INSERT INTO matches (candidate_id, job_id, match_score, skill_score, experience_score,
            project_score, match_reasons, detailed_breakdown)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (candidate_id, job_id) 
           DO UPDATE SET match_score = $3, skill_score = $4, experience_score = $5,
             project_score = $6, match_reasons = $7, detailed_breakdown = $8, updated_at = NOW()`,
          [
            candidateId, job.id, result.match_score, result.skill_score,
            result.experience_score, result.project_score,
            JSON.stringify(result.match_reasons),
            JSON.stringify(result.detailed_breakdown),
          ]
        );

        matches.push({
          candidate_id: candidateId,
          job_id: job.id,
          ...result,
        });
      }
    }

    return matches.sort((a, b) => b.match_score - a.match_score);
  },
};

module.exports = { matchingAgent };
