const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { scrapingAgent } = require('../agents/scrapingAgent');

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

    res.json({
      jobs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(countResult.rows[0].count / limit),
    });
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

router.post('/scrape', authenticate, async (req, res, next) => {
  try {
    const result = await scrapingAgent.scrapeAll();
    res.json({ message: 'Scraping complete', ...result });
  } catch (err) {
    next(err);
  }
});

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

module.exports = router;
