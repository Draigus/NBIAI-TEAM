'use strict';

const MIN_SOURCES_PER_FINDING = 2;
const FALLBACK_MODELS = ['claude-opus-4-6'];

const CONTRACTS = {
  initiative_build: {
    required: ['objective', 'success_criteria', 'tasks'],
    task_requires: ['title', 'definition_of_done'],
    description: 'Initiative with objective, measurable success criteria, tasks with definitions of done, and supporting artefacts',
  },
  research_brief: {
    required: ['method', 'findings', 'gaps'],
    finding_requires: ['claim', 'sources'],
    min_sources: MIN_SOURCES_PER_FINDING,
    description: 'Research brief with method, cited findings (min 2 sources per claim), confidence labels, and explicit gaps',
  },
  draft: {
    required: ['recipient_context', 'body'],
    description: 'Draft communication with recipient context and no unsourced factual claims',
  },
  corrective: {
    required: ['diagnosis', 'changes', 'rollback_path'],
    description: 'Corrective action with diagnosis, what changes, and rollback path',
  },
};

function validateContract(type, deliverable) {
  const contract = CONTRACTS[type];
  if (!contract) return { valid: true, failures: [] };

  const failures = [];

  for (const field of contract.required || []) {
    const val = deliverable[field];
    if (val === undefined || val === null || val === '') {
      failures.push(`Missing required field: ${field}`);
    } else if (Array.isArray(val) && val.length === 0) {
      failures.push(`Empty required array: ${field}`);
    }
  }

  if (type === 'initiative_build' && Array.isArray(deliverable.tasks)) {
    for (let i = 0; i < deliverable.tasks.length; i++) {
      const task = deliverable.tasks[i];
      for (const field of contract.task_requires || []) {
        if (!task[field]) {
          failures.push(`Task ${i + 1} ("${task.title || 'untitled'}") missing: ${field}`);
        }
      }
    }
  }

  if (type === 'research_brief' && Array.isArray(deliverable.findings)) {
    for (let i = 0; i < deliverable.findings.length; i++) {
      const finding = deliverable.findings[i];
      if (!finding.claim) {
        failures.push(`Finding ${i + 1} missing: claim`);
      }
      if (!Array.isArray(finding.sources) || finding.sources.length < contract.min_sources) {
        failures.push(`Finding ${i + 1} ("${(finding.claim || '').slice(0, 50)}") has fewer than ${contract.min_sources} sources`);
      }
    }
  }

  return { valid: failures.length === 0, failures };
}

function buildCritiquePrompt(type, deliverable) {
  const contract = CONTRACTS[type];
  if (!contract) return '';

  const rules = [];
  rules.push(`You are reviewing a ${type.replace(/_/g, ' ')} deliverable.`);
  rules.push('Your job is to refute. Default stance: the deliverable fails until proven otherwise.');
  rules.push(`Contract: ${contract.description}.`);
  rules.push('');
  rules.push('Check each requirement:');

  if (type === 'initiative_build') {
    rules.push('- Does the objective exist and is it specific (not vague)?');
    rules.push('- Are success_criteria measurable (not subjective)?');
    rules.push('- Does every task have a concrete definition_of_done?');
    rules.push('- Are supporting_artefacts generated where the work needs them?');
  }

  if (type === 'research_brief') {
    rules.push('- Does the method section explain the approach?');
    rules.push('- Does every finding cite at least 2 independent sources?');
    rules.push('- Are confidence_labels present for key findings?');
    rules.push('- Is the gaps section honest about what was NOT found?');
    rules.push('- Are there unsourced factual claims?');
  }

  rules.push('');
  rules.push('Output a JSON object: { "pass": boolean, "failures": ["specific failure 1", ...], "score": 0-10 }');
  rules.push('');
  rules.push('Deliverable to review:');
  rules.push('```json');
  rules.push(JSON.stringify(deliverable, null, 2));
  rules.push('```');

  return rules.join('\n');
}

function requiresCodexReview(recipeType, model) {
  if (recipeType === 'research_brief') return true;
  if (FALLBACK_MODELS.some(fb => model && model.startsWith(fb))) {
    return ['initiative_build', 'research_brief', 'corrective'].includes(recipeType);
  }
  return false;
}

module.exports = { validateContract, buildCritiquePrompt, requiresCodexReview, CONTRACTS };
