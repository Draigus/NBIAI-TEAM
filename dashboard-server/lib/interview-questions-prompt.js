// dashboard-server/lib/interview-questions-prompt.js
//
// Builds the Claude API prompt for generating interview questions.

const DEPTH_FOCUS = {
  Engineering: { type: 'code', focus: 'Architecture, algorithms, debugging, code review, system design, performance optimisation' },
  Art: { type: 'art_style', focus: 'Visual direction, art pipeline, style adaptation, technical art, portfolio critique' },
  'Narrative/Writing': { type: 'narrative', focus: 'Story structure, world-building, dialogue craft, editorial process, narrative design' },
  'Game Design': { type: 'code', focus: 'Systems design, player psychology, balance, prototyping, economy design' },
  QA: { type: 'code', focus: 'Test strategy, automation frameworks, regression, pipeline integration, edge case identification' },
  Production: { type: null, focus: 'Scheduling, risk management, stakeholder communication, process improvement, team coordination' },
  Audio: { type: 'art_style', focus: 'Sound design, implementation, middleware (Wwise/FMOD), mix process, adaptive audio' },
  'HR/People': { type: null, focus: 'Policy, employee relations, compliance, culture building, conflict resolution' },
  Leadership: { type: null, focus: 'Vision, team building, cross-functional collaboration, strategy, mentoring' },
};

function buildGenerationPrompt({ jdText, clientName, discipline, seniority }) {
  const depthInfo = DEPTH_FOCUS[discipline] || { type: null, focus: 'Domain-specific mastery' };

  return {
    system: `You are an expert interviewer for ${clientName || 'a game studio'}. Generate interview questions that are specific, probing, and calibrated to the candidate's seniority level. Every question must require the candidate to demonstrate real competency — not just talk about it. No generic "tell me about a time" questions. Each question must be grounded in the specific role, discipline, and company context.`,
    user: `Generate exactly 25 interview questions for a ${seniority || 'mid-level'} ${discipline} position at ${clientName || 'the studio'}.

Job Description:
${jdText || 'No JD provided — generate broadly for the discipline.'}

Generate 5 questions for EACH of these categories:

1. CULTURE — Values alignment, working style, remote collaboration habits specific to a ${clientName ? clientName + ' (fully remote game studio)' : 'game studio'} environment.

2. TECHNICAL — Domain knowledge, tools, methodologies specific to ${discipline}.

3. COLLABORATION — Teamwork, communication, conflict resolution in a cross-discipline game development context.

4. LEADERSHIP — Initiative, mentoring, decision-making calibrated to ${seniority || 'mid-level'} seniority. For junior roles, focus on growth mindset and learning approach.

5. DEPTH — ${depthInfo.focus}

Return a JSON array of objects with this structure:
[
  { "category": "culture", "question_text": "...", "depth_type": null },
  { "category": "technical", "question_text": "...", "depth_type": null },
  { "category": "depth", "question_text": "...", "depth_type": "${depthInfo.type || 'null'}" },
  ...
]

Return ONLY the JSON array, no markdown fencing, no explanation.`,
  };
}

module.exports = { buildGenerationPrompt, DEPTH_FOCUS };
