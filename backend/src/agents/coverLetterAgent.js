const { chatCompletion } = require('./aiClient');

const COVER_LETTER_PROMPT = `You are an expert career coach and professional writer. Given a candidate's resume and a target job description, write a compelling, personalized cover letter.

Rules:
- Address it generically ("Dear Hiring Manager") unless a name is available
- Opening paragraph: Hook with genuine enthusiasm for the specific role and company
- Middle paragraphs: Connect 2-3 of the candidate's strongest relevant experiences to the job requirements, using specific metrics and achievements from the resume
- Closing: Express interest in discussing the role, mention availability
- Tone: Professional but personable, confident without arrogance
- Length: 250-350 words (3-4 paragraphs)
- Naturally incorporate keywords from the job description
- NEVER fabricate achievements or experience
- Return ONLY the cover letter text, no JSON wrapping`;

const coverLetterAgent = {
  async generate(resumeText, jobTitle, company, jobDescription, candidateSkills) {
    const skillsNote = candidateSkills.length > 0
      ? `\nCANDIDATE'S KEY SKILLS: ${candidateSkills.map(s => typeof s === 'string' ? s : s.name).join(', ')}`
      : '';

    return await chatCompletion(
      COVER_LETTER_PROMPT,
      `RESUME:\n${resumeText}\n\nJOB TITLE: ${jobTitle}\nCOMPANY: ${company || 'the company'}\n\nJOB DESCRIPTION:\n${jobDescription}${skillsNote}`,
      { json: false, temperature: 0.4, max_tokens: 2000 }
    );
  },
};

module.exports = { coverLetterAgent };
