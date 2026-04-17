const { chatCompletion } = require('./aiClient');

const ATS_SCORE_PROMPT = `You are an expert ATS (Applicant Tracking System) analyst. Given a resume and a job description, score how well the resume would perform in an ATS scan.

Return a JSON object with exactly this structure:
{
  "ats_score": 72,
  "keyword_matches": [{"keyword": "React", "found": true, "context": "Used React for 3 years"}, {"keyword": "Docker", "found": false, "context": null}],
  "format_issues": ["Missing clear section headers", "Uses tables which ATS cannot parse"],
  "keyword_density_score": 65,
  "section_score": 80,
  "experience_relevance_score": 70,
  "overall_feedback": "Your resume covers 7/10 key requirements. Add Docker and CI/CD mentions."
}

Rules:
- ats_score: 0-100 overall ATS compatibility
- Extract ALL important keywords from the job description and check which exist in the resume
- keyword_density_score: how well keywords are distributed (0-100)
- section_score: does resume have proper ATS-friendly sections (0-100)
- experience_relevance_score: how relevant the experience descriptions are to this role (0-100)
- Be specific and actionable in feedback`;

const TAILOR_PROMPT = `You are an expert resume writer and career coach. Given a resume and a target job description, produce a tailored version of the resume that maximizes ATS compatibility and recruiter appeal for THIS specific role.

Return a JSON object with exactly this structure:
{
  "tailored_summary": "Results-driven full-stack developer with 5+ years building scalable React and Node.js applications...",
  "tailored_skills": ["React", "Node.js", "TypeScript", "AWS", "Docker"],
  "tailored_experience_bullets": [
    {"original": "Built web apps", "improved": "Architected and deployed 3 React/TypeScript web applications serving 50K+ users, reducing load times by 40%"},
    {"original": "Worked on backend", "improved": "Designed RESTful APIs using Node.js and Express, handling 10K+ daily requests with 99.9% uptime"}
  ],
  "keywords_to_add": ["Docker", "CI/CD", "Agile", "Scrum"],
  "keywords_to_emphasize": ["React", "TypeScript", "Node.js"],
  "sections_to_add": ["Certifications", "Technical Projects"],
  "action_items": [
    "Add Docker experience from side projects",
    "Quantify your React component library impact",
    "Move technical skills section above experience"
  ],
  "match_score": 85,
  "confidence": "high"
}

Rules:
- tailored_summary: A rewritten professional summary targeting this specific job
- tailored_experience_bullets: Take weak bullet points and rewrite them with metrics, action verbs, and job-relevant keywords
- keywords_to_add: Skills from the JD missing from resume that the candidate should add if truthful
- action_items: Specific, actionable steps ranked by impact
- match_score: estimated match percentage after applying suggestions (0-100)
- confidence: "high", "medium", "low" based on how much resume data was available
- NEVER fabricate experience — only suggest adding skills the candidate may genuinely have but didn't mention`;

const GENERATE_RESUME_PROMPT = `You are an expert resume writer. Given a candidate's original resume and tailoring suggestions for a specific job, produce a COMPLETE rewritten resume in clean plain-text format.

Rules:
- Preserve all truthful facts from the original resume (dates, company names, education, certifications)
- Apply the tailored summary as the new professional summary
- Replace experience bullet points with the improved versions where provided
- Use the tailored skills list as the skills section
- Add any suggested new sections (e.g. Technical Projects, Certifications) with plausible placeholders marked [ADD YOUR DETAILS]
- Incorporate the keywords that should be added/emphasized naturally into the text
- Use a clean, ATS-friendly format: clear section headers in ALL CAPS, no tables/columns, no graphics
- Use standard resume sections: PROFESSIONAL SUMMARY, TECHNICAL SKILLS, EXPERIENCE, EDUCATION, and any suggested additional sections
- Keep it concise (1-2 pages worth of text)
- NEVER fabricate experience, degrees, or company names — use [ADD YOUR DETAILS] for anything you don't have data for

Return the full resume as a plain string (NOT JSON). Output only the resume text, nothing else.`;

const resumeTailorAgent = {
  async analyzeATS(resumeText, jobTitle, jobDescription) {
    return await chatCompletion(
      ATS_SCORE_PROMPT,
      `RESUME:\n${resumeText}\n\nJOB TITLE: ${jobTitle}\n\nJOB DESCRIPTION:\n${jobDescription}`,
      { json: true, temperature: 0.2, max_tokens: 3000 }
    );
  },

  async tailorResume(resumeText, jobTitle, jobDescription, candidateSkills) {
    const skillsContext = candidateSkills.length > 0
      ? `\nCANDIDATE'S VERIFIED SKILLS: ${candidateSkills.map(s => typeof s === 'string' ? s : s.name).join(', ')}`
      : '';

    return await chatCompletion(
      TAILOR_PROMPT,
      `RESUME:\n${resumeText}\n\nJOB TITLE: ${jobTitle}\n\nJOB DESCRIPTION:\n${jobDescription}${skillsContext}`,
      { json: true, temperature: 0.3, max_tokens: 3000 }
    );
  },

  async fullAnalysis(resumeText, jobTitle, jobDescription, candidateSkills) {
    const [ats, tailor] = await Promise.all([
      this.analyzeATS(resumeText, jobTitle, jobDescription),
      this.tailorResume(resumeText, jobTitle, jobDescription, candidateSkills),
    ]);

    return {
      ats_score: ats.ats_score,
      ats_details: ats,
      tailor_suggestions: tailor,
      match_score_after_tailoring: tailor.match_score,
    };
  },

  async generateTailoredResume(resumeText, jobTitle, jobDescription, tailorSuggestions) {
    const suggestionsContext = JSON.stringify(tailorSuggestions, null, 2);

    return await chatCompletion(
      GENERATE_RESUME_PROMPT,
      `ORIGINAL RESUME:\n${resumeText}\n\nTARGET JOB TITLE: ${jobTitle}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nTAILORING SUGGESTIONS TO APPLY:\n${suggestionsContext}`,
      { json: false, temperature: 0.3, max_tokens: 4000 }
    );
  },
};

module.exports = { resumeTailorAgent };
