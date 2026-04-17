const pool = require('../db/pool');

const learningAgent = {
  async processFeedback(matchId, feedbackType) {
    const feedbackCount = await pool.query('SELECT COUNT(*) FROM feedback');
    const totalFeedback = parseInt(feedbackCount.rows[0].count);

    // Only re-evaluate weights every 10 feedback events
    if (totalFeedback % 10 !== 0) return;

    const currentWeights = await pool.query(
      'SELECT * FROM match_weights WHERE active = true ORDER BY version DESC LIMIT 1'
    );

    if (currentWeights.rows.length === 0) return;
    const w = currentWeights.rows[0];

    const recentFeedback = await pool.query(
      `SELECT f.feedback_type, m.skill_score, m.experience_score, m.project_score, m.match_score
       FROM feedback f
       JOIN matches m ON f.match_id = m.id
       ORDER BY f.created_at DESC
       LIMIT 50`
    );

    const positive = recentFeedback.rows.filter(f =>
      ['apply', 'bookmark'].includes(f.feedback_type)
    );

    const negative = recentFeedback.rows.filter(f =>
      f.feedback_type === 'ignore'
    );

    let skillAdj = 0, expAdj = 0;

    if (positive.length > 0) {
      const avgSkill = positive.reduce((s, f) => s + parseFloat(f.skill_score || 0), 0) / positive.length;
      const avgExp = positive.reduce((s, f) => s + parseFloat(f.experience_score || 0), 0) / positive.length;

      if (avgSkill > 70) skillAdj += 0.01;
      if (avgExp > 70) expAdj += 0.01;
    }

    if (negative.length > 0) {
      const avgSkill = negative.reduce((s, f) => s + parseFloat(f.skill_score || 0), 0) / negative.length;
      if (avgSkill > 70) skillAdj -= 0.005;
    }

    const newSkillWeight = Math.max(0.2, Math.min(0.6, parseFloat(w.skill_weight) + skillAdj));
    const newExpWeight = Math.max(0.1, Math.min(0.4, parseFloat(w.experience_weight) + expAdj));
    const newProjWeight = parseFloat(w.project_weight);
    const newCultureWeight = Math.max(0.05, 1 - newSkillWeight - newExpWeight - newProjWeight);

    if (
      Math.abs(newSkillWeight - parseFloat(w.skill_weight)) > 0.001 ||
      Math.abs(newExpWeight - parseFloat(w.experience_weight)) > 0.001
    ) {
      await pool.query('UPDATE match_weights SET active = false WHERE active = true');

      await pool.query(
        `INSERT INTO match_weights (skill_weight, experience_weight, project_weight, culture_weight, version, active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [newSkillWeight, newExpWeight, newProjWeight, newCultureWeight, parseInt(w.version) + 1]
      );

      console.log(`Learning Agent: Updated weights to v${parseInt(w.version) + 1}`);
    }
  },
};

module.exports = { learningAgent };
