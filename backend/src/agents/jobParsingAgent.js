const { chatCompletion, getEmbedding } = require('./aiClient');
const pool = require('../db/pool');

const JOB_PARSING_PROMPT = `You are an expert job description analyzer for tech roles. Parse the job description and extract structured requirements.

Return a JSON object with exactly this structure:
{
  "required_skills": [{"name": "React", "importance": "critical"}, {"name": "TypeScript", "importance": "high"}],
  "preferred_skills": [{"name": "GraphQL", "importance": "nice-to-have"}],
  "experience_min": 3,
  "experience_max": 7,
  "hidden_requirements": ["Must be comfortable with fast-paced startup environment", "Likely needs strong communication skills for remote work"],
  "role_level": "mid-senior",
  "key_responsibilities": ["Build React components", "Design APIs"],
  "culture_signals": ["Fast-paced", "Startup", "Remote-friendly"],
  "deal_breakers": ["Must know React", "3+ years experience required"]
}

Rules:
- importance: "critical", "high", "medium", "nice-to-have"
- hidden_requirements: infer things NOT explicitly stated but clearly needed
- Be precise about experience ranges - don't inflate
- Detect the real seniority level even if the title is misleading`;

const jobParsingAgent = {
  async parse(description, title) {
    const parsed = await chatCompletion(
      JOB_PARSING_PROMPT,
      `Job Title: ${title}\n\nJob Description:\n${description}`,
      { json: true, temperature: 0.2 }
    );

    return parsed;
  },

  async generateEmbedding(jobId) {
    const result = await pool.query(
      'SELECT title, description, required_skills, preferred_skills, ai_parsed FROM jobs WHERE id = $1',
      [jobId]
    );

    if (result.rows.length === 0) return null;
    const j = result.rows[0];

    const text = [
      `Title: ${j.title}`,
      `Required: ${(j.required_skills || []).map(s => s.name).join(', ')}`,
      `Preferred: ${(j.preferred_skills || []).map(s => s.name).join(', ')}`,
      j.description.slice(0, 2000),
    ].join('\n');

    const embedding = await getEmbedding(text);

    await pool.query(
      'UPDATE jobs SET job_embedding = $1 WHERE id = $2',
      [JSON.stringify(embedding), jobId]
    );

    return embedding;
  },
};

module.exports = { jobParsingAgent };
