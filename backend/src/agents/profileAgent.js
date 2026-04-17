const axios = require('axios');
const { chatCompletion, getEmbedding } = require('./aiClient');
const pool = require('../db/pool');

const RESUME_SYSTEM_PROMPT = `You are an expert technical recruiter AI. Analyze the resume text and extract a structured profile.

Return a JSON object with exactly this structure:
{
  "skills": [{"name": "React", "level": "advanced", "years": 3}],
  "tech_stack": ["React", "Node.js", "PostgreSQL"],
  "experience_years": 5,
  "education": "BS Computer Science",
  "summary": "Senior full-stack developer...",
  "strengths": ["Frontend architecture", "API design"],
  "seniority": "mid-senior"
}

Rules:
- Only include skills you can verify from the text
- Estimate years conservatively
- Skill levels: beginner, intermediate, advanced, expert
- Seniority: junior, mid, mid-senior, senior, lead`;

const GITHUB_SYSTEM_PROMPT = `You are a technical evaluator analyzing a developer's GitHub profile data.

Return a JSON object with:
{
  "primary_languages": ["JavaScript", "TypeScript"],
  "frameworks_detected": ["React", "Express"],
  "complexity_score": 7.5,
  "contribution_level": "active",
  "notable_projects": [{"name": "...", "description": "...", "stars": 0, "complexity": "medium"}],
  "collaboration_score": 6,
  "code_quality_indicators": ["Uses TypeScript", "Has tests"],
  "overall_assessment": "Active developer with strong JS ecosystem expertise"
}

complexity_score: 1-10 scale based on project variety, size, and sophistication
collaboration_score: 1-10 based on PRs, issues, multi-contributor repos`;

const profileAgent = {
  async extractFromResume(resumeText) {
    const profile = await chatCompletion(
      RESUME_SYSTEM_PROMPT,
      `Analyze this resume:\n\n${resumeText}`,
      { json: true, temperature: 0.2 }
    );

    return profile;
  },

  async analyzeGitHub(githubUrl) {
    const cleaned = githubUrl.replace(/\/+$/, '').replace(/\/+/g, '/').replace('https:/', 'https://');
    const parts = cleaned.split('/').filter(Boolean);
    const username = parts[parts.length - 1];
    console.log(`GitHub analysis: URL="${githubUrl}" -> username="${username}"`);

    try {
      const headers = process.env.GITHUB_TOKEN
        ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
        : {};

      const [userRes, reposRes] = await Promise.all([
        axios.get(`https://api.github.com/users/${username}`, { headers }),
        axios.get(`https://api.github.com/users/${username}/repos?per_page=30&sort=updated`, { headers }),
      ]);

      const user = userRes.data;
      const repos = reposRes.data;

      const repoSummaries = repos
        .filter(r => !r.fork)
        .slice(0, 15)
        .map(r => ({
          name: r.name,
          description: r.description,
          language: r.language,
          stars: r.stargazers_count,
          forks: r.forks_count,
          size: r.size,
          has_issues: r.has_issues,
          topics: r.topics,
        }));

      const githubData = {
        username,
        public_repos: user.public_repos,
        followers: user.followers,
        following: user.following,
        account_age_years: Math.floor(
          (Date.now() - new Date(user.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        ),
        bio: user.bio,
        repos: repoSummaries,
      };

      const analysis = await chatCompletion(
        GITHUB_SYSTEM_PROMPT,
        `Analyze this GitHub profile data:\n\n${JSON.stringify(githubData, null, 2)}`,
        { json: true, temperature: 0.2 }
      );

      return {
        stats: githubData,
        ...analysis,
      };
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error('GitHub user not found');
      }
      if (err.response?.status === 403) {
        return {
          stats: { username, error: 'Rate limited' },
          complexity_score: 5,
          primary_languages: [],
          overall_assessment: 'Could not analyze - GitHub API rate limited',
        };
      }
      throw err;
    }
  },

  async generateEmbedding(candidateId) {
    const result = await pool.query(
      'SELECT skills, tech_stack, experience_years, ai_profile, github_stats FROM candidates WHERE id = $1',
      [candidateId]
    );

    if (result.rows.length === 0) return null;
    const c = result.rows[0];

    const text = [
      `Skills: ${(c.skills || []).map(s => `${s.name} (${s.level})`).join(', ')}`,
      `Tech stack: ${(c.tech_stack || []).join(', ')}`,
      `Experience: ${c.experience_years} years`,
      c.ai_profile?.summary || '',
      c.ai_profile?.strengths?.join(', ') || '',
    ].join('\n');

    const embedding = await getEmbedding(text);

    await pool.query(
      'UPDATE candidates SET skill_embedding = $1 WHERE id = $2',
      [JSON.stringify(embedding), candidateId]
    );

    return embedding;
  },
};

module.exports = { profileAgent };
