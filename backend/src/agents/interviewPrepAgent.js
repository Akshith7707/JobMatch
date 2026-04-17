const { chatCompletion } = require('./aiClient');

const INTERVIEW_PREP_PROMPT = `You are a senior technical interviewer and career coach. Given a job description and candidate's skills/experience, generate a comprehensive interview preparation guide.

Return a JSON object with exactly this structure:
{
  "technical_questions": [
    {"question": "Explain the virtual DOM in React", "difficulty": "medium", "topic": "React", "suggested_answer": "The virtual DOM is..."}
  ],
  "behavioral_questions": [
    {"question": "Tell me about a time you dealt with a tight deadline", "framework": "STAR", "suggested_answer": {"situation": "...", "task": "...", "action": "...", "result": "..."}}
  ],
  "system_design": [
    {"question": "Design a real-time notification system", "key_points": ["WebSocket vs SSE", "Message queue", "Scaling considerations"]}
  ],
  "company_research_tips": ["Check their engineering blog", "Review recent product launches"],
  "red_flags_to_avoid": ["Saying you have no weaknesses", "Badmouthing previous employers"],
  "salary_negotiation_tips": ["Research market rates", "Let them make the first offer"],
  "estimated_difficulty": "medium"
}

Rules:
- Generate 5-8 technical questions relevant to the job's required skills
- Generate 3-5 behavioral questions using STAR framework
- Include system design only for mid-senior+ roles
- Difficulty levels: easy, medium, hard
- Tailor questions to the specific tech stack and role level
- Suggested answers should be concise but demonstrate depth`;

const MOCK_INTERVIEWER_PROMPT = `You are a technical interviewer conducting a mock interview for the following role. Stay in character as the interviewer throughout.

Rules:
- Ask one question at a time
- After the candidate answers, provide brief feedback (1-2 sentences) and then ask the next question
- Mix technical and behavioral questions
- Be encouraging but honest about areas for improvement
- If the candidate's answer is weak, hint at what a better answer might include
- After all questions, provide an overall assessment

ROLE CONTEXT:`;

const MOCK_EVALUATE_PROMPT = `You are evaluating a mock interview session. Given the conversation history, provide a comprehensive assessment.

Return a JSON object with:
{
  "overall_score": 75,
  "technical_score": 70,
  "communication_score": 80,
  "confidence_score": 75,
  "strengths": ["Clear explanation of React concepts", "Good use of examples"],
  "improvements": ["Need more depth on system design", "Practice quantifying achievements"],
  "detailed_feedback": "Overall you performed well...",
  "ready_for_interview": true
}

Rules:
- overall_score: 0-100
- Be specific and actionable in feedback
- Highlight both strengths and areas for improvement`;

const interviewPrepAgent = {
  async generatePrep(jobTitle, jobDescription, candidateSkills, experienceYears) {
    const level = experienceYears >= 8 ? 'senior/lead' :
      experienceYears >= 4 ? 'mid-senior' :
      experienceYears >= 2 ? 'mid' : 'junior';

    return await chatCompletion(
      INTERVIEW_PREP_PROMPT,
      `JOB TITLE: ${jobTitle}\nSENIORITY: ${level}\nCANDIDATE EXPERIENCE: ${experienceYears} years\nCANDIDATE SKILLS: ${candidateSkills.map(s => typeof s === 'string' ? s : s.name).join(', ')}\n\nJOB DESCRIPTION:\n${jobDescription}`,
      { json: true, temperature: 0.3, max_tokens: 4000 }
    );
  },

  async conductMockRound(jobTitle, jobDescription, messages) {
    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    const systemPrompt = `${MOCK_INTERVIEWER_PROMPT}\nJob Title: ${jobTitle}\nJob Description: ${jobDescription}\n\nConduct a natural, professional interview. You are on question ${Math.floor(messages.filter(m => m.role === 'assistant').length) + 1} of about 5-6 total questions.`;

    const response = await chatCompletion(
      systemPrompt,
      history.length === 0 ? 'Start the interview.' : messages[messages.length - 1].content,
      { json: false, temperature: 0.4, max_tokens: 1000 }
    );

    return response;
  },

  async evaluateSession(jobTitle, messages) {
    const transcript = messages.map(m =>
      `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.content}`
    ).join('\n\n');

    return await chatCompletion(
      MOCK_EVALUATE_PROMPT,
      `JOB TITLE: ${jobTitle}\n\nINTERVIEW TRANSCRIPT:\n${transcript}`,
      { json: true, temperature: 0.2, max_tokens: 2000 }
    );
  },
};

module.exports = { interviewPrepAgent };
