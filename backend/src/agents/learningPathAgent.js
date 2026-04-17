const { chatCompletion } = require('./aiClient');

const LEARNING_PATH_PROMPT = `You are a career development advisor specializing in software engineering skills. Given a list of missing skills (skills required by jobs but not found in the candidate's profile), generate a learning path.

Return a JSON object with exactly this structure:
{
  "paths": [
    {
      "skill": "Docker",
      "priority": "high",
      "estimated_hours": 20,
      "difficulty": "beginner",
      "resources": [
        {"title": "Docker Getting Started", "url": "https://docs.docker.com/get-started/", "type": "docs", "free": true},
        {"title": "Docker for Beginners - freeCodeCamp", "url": "https://www.youtube.com/watch?v=fqMOX6JJhGo", "type": "video", "free": true},
        {"title": "Docker Mastery on Udemy", "url": "https://www.udemy.com/course/docker-mastery/", "type": "course", "free": false}
      ],
      "quick_win": "Complete the Docker tutorial and containerize one of your existing projects",
      "job_demand_note": "Required by 8 of your matched jobs"
    }
  ],
  "overall_timeline": "4-6 weeks to cover high-priority skills",
  "strategy": "Focus on Docker and Kubernetes first as they appear in 80% of your target jobs"
}

Rules:
- Priority: high (needed by many target jobs), medium, low
- Prefer FREE resources (YouTube, docs, freeCodeCamp, MDN)
- Include a mix of resource types: video, docs, course, tutorial, project
- Use REAL, well-known resource URLs that are likely to exist
- quick_win: one specific actionable step to start learning immediately
- Sort paths by priority (high first)
- Be practical and time-efficient`;

const learningPathAgent = {
  async generatePath(missingSkills, candidateSkills, targetJobTitles) {
    const context = [
      `MISSING SKILLS: ${missingSkills.join(', ')}`,
      `EXISTING SKILLS: ${candidateSkills.map(s => typeof s === 'string' ? s : s.name).join(', ')}`,
      `TARGET ROLES: ${targetJobTitles.join(', ')}`,
    ].join('\n');

    return await chatCompletion(
      LEARNING_PATH_PROMPT,
      context,
      { json: true, temperature: 0.3, max_tokens: 4000 }
    );
  },
};

module.exports = { learningPathAgent };
