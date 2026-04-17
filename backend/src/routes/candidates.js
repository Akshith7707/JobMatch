const router = require('express').Router();
const multer = require('multer');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { profileAgent } = require('../agents/profileAgent');
const { matchingAgent } = require('../agents/matchingAgent');

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

    // Auto-trigger matching if profile is complete
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
              j.required_skills, j.url, j.source, j.tags, j.posted_at as job_posted_at
       FROM matches m
       JOIN jobs j ON m.job_id = j.id
       WHERE m.candidate_id = $1 AND j.status = 'active'
       ORDER BY m.match_score DESC
       LIMIT 30`,
      [candidate.id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
