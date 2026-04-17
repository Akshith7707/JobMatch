const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { scrapingAgent } = require('../agents/scrapingAgent');
const { jobParsingAgent } = require('../agents/jobParsingAgent');
const { matchingAgent } = require('../agents/matchingAgent');

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, skills, remote, source } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ["status = 'active'"];

    if (skills) {
      params.push(`%${skills}%`);
      conditions.push(`(required_skills::text ILIKE $${params.length} OR tags::text ILIKE $${params.length} OR title ILIKE $${params.length})`);
    }

    if (remote === 'true') {
      conditions.push('remote = true');
    }

    if (source) {
      params.push(source);
      conditions.push(`source = $${params.length}`);
    }

    const where = conditions.join(' AND ');

    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const result = await pool.query(
      `SELECT id, title, company, location, remote, salary_min, salary_max,
              required_skills, tags, source, url, posted_at, created_at
       FROM jobs WHERE ${where}
       ORDER BY posted_at DESC NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM jobs WHERE ${where}`,
      params.slice(0, -2)
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / parseInt(limit)) || 0;

    res.json({
      jobs: result.rows,
      total: totalCount,
      page: parseInt(page),
      pages: totalPages,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/scrape', authenticate, async (req, res, next) => {
  try {
    const result = await scrapingAgent.scrapeAll();

    parseUnparsedJobs().catch(err =>
      console.error('Background parsing failed:', err.message)
    );

    // Re-match all candidates with complete profiles against new jobs
    rematchAllCandidates().catch(err =>
      console.error('Background re-matching failed:', err.message)
    );

    res.json({ message: 'Scraping complete', ...result });
  } catch (err) {
    next(err);
  }
});

async function rematchAllCandidates() {
  const candidates = await pool.query(
    'SELECT id FROM candidates WHERE profile_complete = true'
  );

  for (const candidate of candidates.rows) {
    try {
      await matchingAgent.matchCandidateToJobs(candidate.id);
    } catch (err) {
      console.error(`Re-match failed for candidate ${candidate.id}:`, err.message);
    }
  }
  console.log(`Re-matched ${candidates.rows.length} candidates after scrape`);
}

async function parseUnparsedJobs() {
  const unparsed = await pool.query(
    `SELECT id, title, description, tags FROM jobs
     WHERE parsed = false AND description IS NOT NULL AND LENGTH(description) > 50
     ORDER BY created_at DESC LIMIT 15`
  );

  let parsed = 0;
  for (const job of unparsed.rows) {
    try {
      const result = await jobParsingAgent.parse(job.description, job.title);
      await pool.query(
        `UPDATE jobs SET
          required_skills = $1, preferred_skills = $2,
          experience_min = $3, experience_max = $4,
          ai_parsed = $5, parsed = true, updated_at = NOW()
         WHERE id = $6`,
        [
          JSON.stringify(result.required_skills || []),
          JSON.stringify(result.preferred_skills || []),
          result.experience_min || 0,
          result.experience_max || null,
          JSON.stringify(result),
          job.id,
        ]
      );
      parsed++;
    } catch (err) {
      console.error(`Parse failed for job ${job.id}:`, err.message);
    }
  }
  console.log(`AI parsed ${parsed}/${unparsed.rows.length} jobs`);
}

router.get('/stats/sources', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT source, COUNT(*) as count,
              MAX(posted_at) as latest_post
       FROM jobs WHERE status = 'active'
       GROUP BY source ORDER BY count DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/similar', async (req, res, next) => {
  try {
    const job = await pool.query('SELECT title, required_skills, tags, company FROM jobs WHERE id = $1', [req.params.id]);
    if (job.rows.length === 0) return res.status(404).json({ error: 'Job not found' });

    const j = job.rows[0];
    const skills = Array.isArray(j.required_skills) ? j.required_skills : [];
    const tags = Array.isArray(j.tags) ? j.tags : [];
    const keywords = [...skills.map(s => typeof s === 'string' ? s : s.name), ...tags].slice(0, 5);

    let similar;
    if (keywords.length > 0) {
      const pattern = keywords.join('|');
      similar = await pool.query(
        `SELECT id, title, company, location, remote, salary_min, salary_max, source, url, posted_at
         FROM jobs WHERE id != $1 AND status = 'active'
           AND (required_skills::text ~* $2 OR tags::text ~* $2 OR title ~* $2)
         ORDER BY posted_at DESC NULLS LAST LIMIT 6`,
        [req.params.id, pattern]
      );
    } else {
      similar = await pool.query(
        `SELECT id, title, company, location, remote, salary_min, salary_max, source, url, posted_at
         FROM jobs WHERE id != $1 AND status = 'active'
         ORDER BY posted_at DESC NULLS LAST LIMIT 6`,
        [req.params.id]
      );
    }

    res.json(similar.rows);
  } catch (err) { next(err); }
});

module.exports = router;
