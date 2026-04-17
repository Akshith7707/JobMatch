const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { matchingAgent } = require('../agents/matchingAgent');

router.post('/match/candidate/:candidateId', authenticate, async (req, res, next) => {
  try {
    const matches = await matchingAgent.matchCandidateToJobs(req.params.candidateId);
    res.json({ matches, count: matches.length });
  } catch (err) {
    next(err);
  }
});

router.get('/weights', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM match_weights WHERE active = true ORDER BY version DESC LIMIT 1'
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    next(err);
  }
});

module.exports = router;
