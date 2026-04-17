const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { learningAgent } = require('../agents/learningAgent');

const PROTECTED_STATUSES = new Set(['bookmarked', 'applied']);

router.post('/feedback', authenticate, async (req, res, next) => {
  try {
    const { match_id, feedback_type } = req.body;

    if (!match_id || !feedback_type) {
      return res.status(400).json({ error: 'match_id and feedback_type required' });
    }

    const matchCheck = await pool.query('SELECT * FROM matches WHERE id = $1', [match_id]);
    if (matchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    await pool.query(
      'INSERT INTO feedback (match_id, user_id, feedback_type) VALUES ($1, $2, $3)',
      [match_id, req.user.id, feedback_type]
    );

    const statusMap = {
      apply: 'applied',
      bookmark: 'bookmarked',
      ignore: 'ignored',
      click: 'viewed',
    };

    const currentStatus = matchCheck.rows[0].status;
    const newStatus = statusMap[feedback_type];

    if (newStatus && !(feedback_type === 'click' && PROTECTED_STATUSES.has(currentStatus))) {
      await pool.query(
        'UPDATE matches SET status = $1, updated_at = NOW() WHERE id = $2',
        [newStatus, match_id]
      );
    }

    learningAgent.processFeedback(match_id, feedback_type).catch(err =>
      console.error('Learning agent error:', err)
    );

    res.json({ message: 'Feedback recorded' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
