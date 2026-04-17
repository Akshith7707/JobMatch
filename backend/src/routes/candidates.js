const router = require('express').Router();
const multer = require('multer');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { profileAgent } = require('../agents/profileAgent');
const { matchingAgent } = require('../agents/matchingAgent');
const { resumeTailorAgent } = require('../agents/resumeTailorAgent');
const { coverLetterAgent } = require('../agents/coverLetterAgent');
const { interviewPrepAgent } = require('../agents/interviewPrepAgent');
const { learningPathAgent } = require('../agents/learningPathAgent');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.email, u.full_name FROM candidates c
       JOIN users u ON c.user_id = u.id
       WHERE c.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/resume', authenticate, upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file provided' });
    }

    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text;

    await pool.query(
      'UPDATE candidates SET resume_text = $1, updated_at = NOW() WHERE user_id = $2',
      [resumeText, req.user.id]
    );

    let profile;
    try {
      profile = await profileAgent.extractFromResume(resumeText);
    } catch (aiErr) {
      console.error('AI resume parsing failed:', aiErr.message);
      profile = { skills: [], experience_years: 0, tech_stack: [], summary: 'Could not parse' };
    }

    await pool.query(
      `UPDATE candidates SET
        skills = $1, experience_years = $2, tech_stack = $3,
        ai_profile = $4, updated_at = NOW()
       WHERE user_id = $5`,
      [
        JSON.stringify(profile.skills || []),
        profile.experience_years || 0,
        JSON.stringify(profile.tech_stack || []),
        JSON.stringify(profile),
        req.user.id,
      ]
    );

    // Check if profile can be marked complete (resume is enough to start matching)
    const candRow = await pool.query(
      'SELECT id, github_url FROM candidates WHERE user_id = $1',
      [req.user.id]
    );
    if (candRow.rows[0]?.github_url) {
      await pool.query(
        'UPDATE candidates SET profile_complete = TRUE WHERE user_id = $1',
        [req.user.id]
      );
      matchingAgent.matchCandidateToJobs(candRow.rows[0].id).catch(err =>
        console.error('Post-resume matching failed:', err.message)
      );
    }

    res.json({ message: 'Resume processed', profile });
  } catch (err) {
    next(err);
  }
});

router.post('/github', authenticate, async (req, res, next) => {
  try {
    const { github_url } = req.body;
    if (!github_url) {
      return res.status(400).json({ error: 'GitHub URL required' });
    }

    await pool.query(
      'UPDATE candidates SET github_url = $1, updated_at = NOW() WHERE user_id = $2',
      [github_url, req.user.id]
    );

    let githubProfile;
    try {
      githubProfile = await profileAgent.analyzeGitHub(github_url);
    } catch (ghErr) {
      console.error('GitHub analysis failed:', ghErr.message);
      githubProfile = {
        stats: { error: ghErr.message },
        complexity_score: 5,
      };
    }

    await pool.query(
      `UPDATE candidates SET
        github_stats = $1, project_complexity_score = $2,
        profile_complete = TRUE, updated_at = NOW()
       WHERE user_id = $3`,
      [
        JSON.stringify(githubProfile.stats || {}),
        githubProfile.complexity_score || 5,
        req.user.id,
      ]
    );

    // Trigger matching now that profile is complete
    const candRow = await pool.query(
      'SELECT id FROM candidates WHERE user_id = $1',
      [req.user.id]
    );
    if (candRow.rows[0]) {
      matchingAgent.matchCandidateToJobs(candRow.rows[0].id).catch(err =>
        console.error('Post-GitHub matching failed:', err.message)
      );
    }

    res.json({ message: 'GitHub analyzed', github: githubProfile });
  } catch (err) {
    next(err);
  }
});

router.get('/recommendations', authenticate, async (req, res, next) => {
  try {
    const candidateResult = await pool.query(
      'SELECT * FROM candidates WHERE user_id = $1',
      [req.user.id]
    );

    if (candidateResult.rows.length === 0) return res.json([]);
    const candidate = candidateResult.rows[0];

    if (candidate.profile_complete) {
      const matchCount = await pool.query(
        'SELECT COUNT(*) FROM matches WHERE candidate_id = $1',
        [candidate.id]
      );

      if (parseInt(matchCount.rows[0].count) === 0) {
        try {
          await matchingAgent.matchCandidateToJobs(candidate.id);
        } catch (matchErr) {
          console.error('Auto-matching failed:', matchErr.message);
        }
      }
    }

    const result = await pool.query(
      `SELECT m.*, j.title, j.company, j.location, j.remote, j.salary_min, j.salary_max,
              j.required_skills, j.preferred_skills, j.url, j.source, j.tags, j.posted_at as job_posted_at
       FROM matches m
       JOIN jobs j ON m.job_id = j.id
       WHERE m.candidate_id = $1 AND j.status = 'active' AND m.status != 'ignored'
       ORDER BY m.match_score DESC
       LIMIT 50`,
      [candidate.id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/bookmarked', authenticate, async (req, res, next) => {
  try {
    const candidateResult = await pool.query(
      'SELECT id FROM candidates WHERE user_id = $1',
      [req.user.id]
    );
    if (candidateResult.rows.length === 0) return res.json([]);

    const result = await pool.query(
      `SELECT m.*, j.title, j.company, j.location, j.remote, j.salary_min, j.salary_max,
              j.required_skills, j.preferred_skills, j.url, j.source, j.tags, j.posted_at as job_posted_at
       FROM matches m
       JOIN jobs j ON m.job_id = j.id
       WHERE m.candidate_id = $1 AND m.status = 'bookmarked' AND j.status = 'active'
       ORDER BY m.updated_at DESC`,
      [candidateResult.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/applied', authenticate, async (req, res, next) => {
  try {
    const candidateResult = await pool.query(
      'SELECT id FROM candidates WHERE user_id = $1',
      [req.user.id]
    );
    if (candidateResult.rows.length === 0) return res.json([]);

    const result = await pool.query(
      `SELECT m.*, j.title, j.company, j.location, j.remote, j.salary_min, j.salary_max,
              j.required_skills, j.preferred_skills, j.url, j.source, j.tags, j.posted_at as job_posted_at
       FROM matches m
       JOIN jobs j ON m.job_id = j.id
       WHERE m.candidate_id = $1 AND m.status = 'applied' AND j.status = 'active'
       ORDER BY m.updated_at DESC`,
      [candidateResult.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/tailor-resume', authenticate, async (req, res, next) => {
  try {
    const { job_id } = req.body;
    if (!job_id) {
      return res.status(400).json({ error: 'job_id is required' });
    }

    const candidateResult = await pool.query(
      'SELECT * FROM candidates WHERE user_id = $1',
      [req.user.id]
    );
    if (candidateResult.rows.length === 0 || !candidateResult.rows[0].resume_text) {
      return res.status(400).json({ error: 'Please upload a resume first' });
    }
    const candidate = candidateResult.rows[0];

    const jobResult = await pool.query('SELECT * FROM jobs WHERE id = $1', [job_id]);
    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const job = jobResult.rows[0];

    if (!job.description || job.description.length < 30) {
      return res.status(400).json({ error: 'This job has insufficient description for analysis' });
    }

    const analysis = await resumeTailorAgent.fullAnalysis(
      candidate.resume_text,
      job.title,
      job.description,
      candidate.skills || []
    );

    res.json({
      job_id: job.id,
      job_title: job.title,
      job_company: job.company,
      ...analysis,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/generate-tailored-resume', authenticate, async (req, res, next) => {
  try {
    const { job_id, tailor_suggestions } = req.body;
    if (!job_id || !tailor_suggestions) {
      return res.status(400).json({ error: 'job_id and tailor_suggestions are required' });
    }

    const candidateResult = await pool.query(
      'SELECT * FROM candidates WHERE user_id = $1',
      [req.user.id]
    );
    if (candidateResult.rows.length === 0 || !candidateResult.rows[0].resume_text) {
      return res.status(400).json({ error: 'Please upload a resume first' });
    }
    const candidate = candidateResult.rows[0];

    const jobResult = await pool.query('SELECT * FROM jobs WHERE id = $1', [job_id]);
    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const job = jobResult.rows[0];

    const tailoredResume = await resumeTailorAgent.generateTailoredResume(
      candidate.resume_text,
      job.title,
      job.description || '',
      tailor_suggestions
    );

    res.json({
      job_id: job.id,
      job_title: job.title,
      tailored_resume: tailoredResume,
    });
  } catch (err) {
    next(err);
  }
});

// --- Cover Letter Generator ---
router.post('/cover-letter', authenticate, async (req, res, next) => {
  try {
    const { job_id } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id is required' });

    const candidateResult = await pool.query('SELECT * FROM candidates WHERE user_id = $1', [req.user.id]);
    if (candidateResult.rows.length === 0 || !candidateResult.rows[0].resume_text) {
      return res.status(400).json({ error: 'Please upload a resume first' });
    }
    const candidate = candidateResult.rows[0];

    const jobResult = await pool.query('SELECT * FROM jobs WHERE id = $1', [job_id]);
    if (jobResult.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    const job = jobResult.rows[0];

    const content = await coverLetterAgent.generate(
      candidate.resume_text, job.title, job.company,
      job.description || '', candidate.skills || []
    );

    await pool.query(
      `INSERT INTO cover_letters (candidate_id, job_id, content) VALUES ($1, $2, $3)
       ON CONFLICT (candidate_id, job_id) DO UPDATE SET content = $3, created_at = NOW()`,
      [candidate.id, job.id, content]
    );

    res.json({ job_id: job.id, job_title: job.title, company: job.company, content });
  } catch (err) { next(err); }
});

// --- Interview Prep ---
router.post('/interview-prep', authenticate, async (req, res, next) => {
  try {
    const { job_id } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id is required' });

    const candidateResult = await pool.query('SELECT * FROM candidates WHERE user_id = $1', [req.user.id]);
    if (candidateResult.rows.length === 0) return res.status(400).json({ error: 'Profile not found' });
    const candidate = candidateResult.rows[0];

    const jobResult = await pool.query('SELECT * FROM jobs WHERE id = $1', [job_id]);
    if (jobResult.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    const job = jobResult.rows[0];

    const prep = await interviewPrepAgent.generatePrep(
      job.title, job.description || '',
      candidate.skills || [], candidate.experience_years || 0
    );

    res.json({ job_id: job.id, job_title: job.title, company: job.company, prep });
  } catch (err) { next(err); }
});

// --- Learning Path ---
router.get('/learning-path', authenticate, async (req, res, next) => {
  try {
    const candidateResult = await pool.query('SELECT * FROM candidates WHERE user_id = $1', [req.user.id]);
    if (candidateResult.rows.length === 0) return res.json({ paths: [] });
    const candidate = candidateResult.rows[0];

    const matchResult = await pool.query(
      `SELECT DISTINCT j.title, j.required_skills, m.detailed_breakdown
       FROM matches m JOIN jobs j ON m.job_id = j.id
       WHERE m.candidate_id = $1 AND j.status = 'active' AND m.status != 'ignored'
       ORDER BY m.match_score DESC LIMIT 20`,
      [candidate.id]
    );

    const missingSet = new Set();
    const titles = [];
    for (const row of matchResult.rows) {
      titles.push(row.title);
      const gap = row.detailed_breakdown?.skill_gap;
      if (gap?.missing) gap.missing.forEach(s => missingSet.add(s.name || s));
    }

    if (missingSet.size === 0) {
      return res.json({ paths: [], overall_timeline: 'No skill gaps detected!', strategy: 'You cover all required skills.' });
    }

    const result = await learningPathAgent.generatePath(
      [...missingSet].slice(0, 10), candidate.skills || [], titles.slice(0, 5)
    );
    res.json(result);
  } catch (err) { next(err); }
});

// --- Analytics ---
router.get('/analytics', authenticate, async (req, res, next) => {
  try {
    const candidateResult = await pool.query('SELECT id FROM candidates WHERE user_id = $1', [req.user.id]);
    if (candidateResult.rows.length === 0) return res.json({});
    const candidateId = candidateResult.rows[0].id;

    const [matchStats, statusCounts, topSkills, activityTimeline, scoreDistribution] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, AVG(match_score) as avg_score, MAX(match_score) as max_score FROM matches WHERE candidate_id = $1', [candidateId]),
      pool.query("SELECT status, COUNT(*) as count FROM matches WHERE candidate_id = $1 GROUP BY status", [candidateId]),
      pool.query(
        `SELECT skill, COUNT(*) as demand FROM (
          SELECT jsonb_array_elements_text(j.required_skills) as skill
          FROM matches m JOIN jobs j ON m.job_id = j.id
          WHERE m.candidate_id = $1 AND j.status = 'active'
        ) sub GROUP BY skill ORDER BY demand DESC LIMIT 15`,
        [candidateId]
      ),
      pool.query(
        `SELECT DATE(created_at) as date, feedback_type, COUNT(*) as count
         FROM feedback WHERE user_id = $1
         GROUP BY DATE(created_at), feedback_type
         ORDER BY date DESC LIMIT 60`,
        [req.user.id]
      ),
      pool.query(
        `SELECT
          CASE WHEN match_score >= 80 THEN '80-100'
               WHEN match_score >= 60 THEN '60-79'
               WHEN match_score >= 40 THEN '40-59'
               ELSE '0-39' END as range,
          COUNT(*) as count
         FROM matches WHERE candidate_id = $1
         GROUP BY range ORDER BY range DESC`,
        [candidateId]
      ),
    ]);

    const appPipeline = await pool.query(
      'SELECT stage, COUNT(*) as count FROM applications WHERE candidate_id = $1 GROUP BY stage',
      [candidateId]
    );

    res.json({
      overview: matchStats.rows[0],
      status_counts: statusCounts.rows,
      top_skills_in_demand: topSkills.rows,
      activity: activityTimeline.rows,
      score_distribution: scoreDistribution.rows,
      pipeline: appPipeline.rows,
    });
  } catch (err) { next(err); }
});

// --- Multi-Resume Management ---
router.get('/resume-versions', authenticate, async (req, res, next) => {
  try {
    const candidateResult = await pool.query('SELECT id FROM candidates WHERE user_id = $1', [req.user.id]);
    if (candidateResult.rows.length === 0) return res.json([]);

    const result = await pool.query(
      'SELECT id, label, is_active, created_at FROM resume_versions WHERE candidate_id = $1 ORDER BY created_at DESC',
      [candidateResult.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/resume-versions', authenticate, async (req, res, next) => {
  try {
    const { label, resume_text } = req.body;
    if (!label || !resume_text) return res.status(400).json({ error: 'label and resume_text required' });

    const candidateResult = await pool.query('SELECT id FROM candidates WHERE user_id = $1', [req.user.id]);
    if (candidateResult.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });

    let profile = {};
    try {
      profile = await profileAgent.extractFromResume(resume_text);
    } catch { profile = { skills: [] }; }

    const result = await pool.query(
      `INSERT INTO resume_versions (candidate_id, label, resume_text, skills, ai_profile)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, label, is_active, created_at`,
      [candidateResult.rows[0].id, label, resume_text, JSON.stringify(profile.skills || []), JSON.stringify(profile)]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.put('/resume-versions/:id/activate', authenticate, async (req, res, next) => {
  try {
    const candidateResult = await pool.query('SELECT id FROM candidates WHERE user_id = $1', [req.user.id]);
    if (candidateResult.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    const candidateId = candidateResult.rows[0].id;

    await pool.query('UPDATE resume_versions SET is_active = FALSE WHERE candidate_id = $1', [candidateId]);

    const version = await pool.query(
      'UPDATE resume_versions SET is_active = TRUE WHERE id = $1 AND candidate_id = $2 RETURNING *',
      [req.params.id, candidateId]
    );
    if (version.rows.length === 0) return res.status(404).json({ error: 'Version not found' });

    const v = version.rows[0];
    await pool.query(
      `UPDATE candidates SET resume_text = $1, skills = $2, ai_profile = $3, updated_at = NOW() WHERE id = $4`,
      [v.resume_text, JSON.stringify(v.skills || []), JSON.stringify(v.ai_profile || {}), candidateId]
    );

    matchingAgent.matchCandidateToJobs(candidateId).catch(err =>
      console.error('Re-match after resume switch failed:', err.message)
    );

    res.json({ message: 'Resume version activated', version: v });
  } catch (err) { next(err); }
});

// --- Salary Insights ---
router.get('/salary-insights', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        COALESCE(NULLIF(regexp_replace(title, '(Senior|Junior|Lead|Staff|Principal|Sr\\.|Jr\\.)', '', 'gi'), ''), title) as role_group,
        COUNT(*) as job_count,
        ROUND(AVG(salary_min)) as avg_min,
        ROUND(AVG(salary_max)) as avg_max,
        ROUND(MIN(salary_min)) as lowest,
        ROUND(MAX(salary_max)) as highest,
        ROUND(AVG((COALESCE(salary_min,0) + COALESCE(salary_max,0)) / 2)) as avg_mid
       FROM jobs
       WHERE status = 'active' AND (salary_min IS NOT NULL OR salary_max IS NOT NULL)
       GROUP BY role_group
       HAVING COUNT(*) >= 2
       ORDER BY avg_mid DESC
       LIMIT 20`
    );

    const locationResult = await pool.query(
      `SELECT location, COUNT(*) as count,
              ROUND(AVG(salary_min)) as avg_min, ROUND(AVG(salary_max)) as avg_max
       FROM jobs
       WHERE status = 'active' AND salary_min IS NOT NULL AND location IS NOT NULL
       GROUP BY location HAVING COUNT(*) >= 2
       ORDER BY avg_max DESC LIMIT 10`
    );

    res.json({ by_role: result.rows, by_location: locationResult.rows });
  } catch (err) { next(err); }
});

// --- Notifications ---
router.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const unreadCount = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = FALSE',
      [req.user.id]
    );
    res.json({ notifications: result.rows, unread_count: parseInt(unreadCount.rows[0].count) });
  } catch (err) { next(err); }
});

router.put('/notifications/read-all', authenticate, async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
});

// --- Application Tracker ---
router.get('/applications', authenticate, async (req, res, next) => {
  try {
    const candidateResult = await pool.query('SELECT id FROM candidates WHERE user_id = $1', [req.user.id]);
    if (candidateResult.rows.length === 0) return res.json([]);

    const result = await pool.query(
      `SELECT a.*, j.title, j.company, j.location, j.remote, j.salary_min, j.salary_max, j.url, j.source,
              m.match_score
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       LEFT JOIN matches m ON a.match_id = m.id
       WHERE a.candidate_id = $1
       ORDER BY a.updated_at DESC`,
      [candidateResult.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/applications', authenticate, async (req, res, next) => {
  try {
    const { job_id, match_id, notes } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id is required' });

    const candidateResult = await pool.query('SELECT id FROM candidates WHERE user_id = $1', [req.user.id]);
    if (candidateResult.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });

    const result = await pool.query(
      `INSERT INTO applications (candidate_id, job_id, match_id, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (candidate_id, job_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [candidateResult.rows[0].id, job_id, match_id || null, notes || '']
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.put('/applications/:id', authenticate, async (req, res, next) => {
  try {
    const { stage, notes } = req.body;
    const candidateResult = await pool.query('SELECT id FROM candidates WHERE user_id = $1', [req.user.id]);
    if (candidateResult.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });

    const updates = [];
    const params = [];
    if (stage) { params.push(stage); updates.push(`stage = $${params.length}`); }
    if (notes !== undefined) { params.push(notes); updates.push(`notes = $${params.length}`); }
    params.push(req.params.id);
    params.push(candidateResult.rows[0].id);

    const result = await pool.query(
      `UPDATE applications SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length - 1} AND candidate_id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// --- Mock Interview ---
router.post('/mock-interview/start', authenticate, async (req, res, next) => {
  try {
    const { job_id } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id is required' });

    const candidateResult = await pool.query('SELECT id FROM candidates WHERE user_id = $1', [req.user.id]);
    if (candidateResult.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });

    const jobResult = await pool.query('SELECT * FROM jobs WHERE id = $1', [job_id]);
    if (jobResult.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    const job = jobResult.rows[0];

    const firstMessage = await interviewPrepAgent.conductMockRound(
      job.title, job.description || '', []
    );

    const messages = [{ role: 'assistant', content: firstMessage }];

    const session = await pool.query(
      `INSERT INTO mock_interviews (candidate_id, job_id, messages) VALUES ($1, $2, $3) RETURNING *`,
      [candidateResult.rows[0].id, job_id, JSON.stringify(messages)]
    );

    res.json({ session: session.rows[0], job_title: job.title });
  } catch (err) { next(err); }
});

router.post('/mock-interview/:id/message', authenticate, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const session = await pool.query('SELECT * FROM mock_interviews WHERE id = $1', [req.params.id]);
    if (session.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    const s = session.rows[0];
    const jobResult = await pool.query('SELECT title, description FROM jobs WHERE id = $1', [s.job_id]);
    const job = jobResult.rows[0] || { title: 'Software Engineer', description: '' };

    const messages = [...(s.messages || []), { role: 'user', content: message }];

    const reply = await interviewPrepAgent.conductMockRound(
      job.title, job.description || '', messages
    );

    messages.push({ role: 'assistant', content: reply });

    await pool.query(
      'UPDATE mock_interviews SET messages = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(messages), req.params.id]
    );

    res.json({ reply, messages });
  } catch (err) { next(err); }
});

router.post('/mock-interview/:id/end', authenticate, async (req, res, next) => {
  try {
    const session = await pool.query('SELECT * FROM mock_interviews WHERE id = $1', [req.params.id]);
    if (session.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    const s = session.rows[0];
    const jobResult = await pool.query('SELECT title FROM jobs WHERE id = $1', [s.job_id]);

    const evaluation = await interviewPrepAgent.evaluateSession(
      jobResult.rows[0]?.title || 'Software Engineer', s.messages || []
    );

    await pool.query(
      'UPDATE mock_interviews SET score = $1, feedback = $2, status = $3, updated_at = NOW() WHERE id = $4',
      [evaluation.overall_score, JSON.stringify(evaluation), 'completed', req.params.id]
    );

    res.json({ evaluation, session_id: req.params.id });
  } catch (err) { next(err); }
});

router.get('/mock-interviews', authenticate, async (req, res, next) => {
  try {
    const candidateResult = await pool.query('SELECT id FROM candidates WHERE user_id = $1', [req.user.id]);
    if (candidateResult.rows.length === 0) return res.json([]);

    const result = await pool.query(
      `SELECT mi.*, j.title as job_title, j.company
       FROM mock_interviews mi JOIN jobs j ON mi.job_id = j.id
       WHERE mi.candidate_id = $1 ORDER BY mi.created_at DESC LIMIT 20`,
      [candidateResult.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// --- Company Research ---
router.get('/company-research/:company', authenticate, async (req, res, next) => {
  try {
    const company = decodeURIComponent(req.params.company);
    const result = await pool.query(
      `SELECT title, location, remote, salary_min, salary_max, source, posted_at
       FROM jobs WHERE company ILIKE $1 AND status = 'active' ORDER BY posted_at DESC LIMIT 20`,
      [`%${company}%`]
    );

    const stats = await pool.query(
      `SELECT COUNT(*) as total_jobs,
              COUNT(CASE WHEN remote THEN 1 END) as remote_jobs,
              ROUND(AVG(salary_min)) as avg_salary_min,
              ROUND(AVG(salary_max)) as avg_salary_max,
              array_agg(DISTINCT source) as sources
       FROM jobs WHERE company ILIKE $1 AND status = 'active'`,
      [`%${company}%`]
    );

    const techStack = await pool.query(
      `SELECT skill, COUNT(*) as count FROM (
        SELECT jsonb_array_elements_text(required_skills) as skill
        FROM jobs WHERE company ILIKE $1 AND status = 'active'
       ) sub GROUP BY skill ORDER BY count DESC LIMIT 10`,
      [`%${company}%`]
    );

    res.json({
      company,
      stats: stats.rows[0],
      tech_stack: techStack.rows,
      open_positions: result.rows,
    });
  } catch (err) { next(err); }
});

// --- Portfolio / Public Profile ---
router.get('/portfolio/:userId', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.skills, c.tech_stack, c.experience_years, c.github_url, c.github_stats,
              c.ai_profile, c.project_complexity_score,
              u.full_name
       FROM candidates c JOIN users u ON c.user_id = u.id
       WHERE c.user_id = $1 AND c.profile_complete = TRUE`,
      [req.params.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });

    const profile = result.rows[0];
    res.json({
      name: profile.full_name,
      skills: profile.skills,
      tech_stack: profile.tech_stack,
      experience_years: profile.experience_years,
      github_url: profile.github_url,
      github_stats: profile.github_stats,
      ai_profile: profile.ai_profile,
      complexity_score: profile.project_complexity_score,
    });
  } catch (err) { next(err); }
});

module.exports = router;
