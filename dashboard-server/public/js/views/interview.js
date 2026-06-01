// ==================== INTERVIEW MODE ====================
// Full-page interview scoring view for interviewers.
// Hash route: #interview/{session_id}
// Renders a dark-themed scorecard with question navigation,
// 1-5 score buttons, optional notes, and auto-save.

import { registerView } from '../core/router.js';

const CATEGORY_COLOURS = {
  culture: '#f59e0b', technical: '#3b82f6', collaboration: '#10b981',
  leadership: '#8b5cf6', depth: '#ef4444',
};
const CATEGORY_LABELS = {
  culture: 'Culture', technical: 'Technical', collaboration: 'Collaboration',
  leadership: 'Leadership', depth: 'Depth',
};
const SCORE_LABELS = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'];

async function renderInterviewMode(container, sessionId) {
  if (!sessionId) {
    container.innerHTML = '<div style="padding:48px;text-align:center;color:var(--text-muted);font-size:1rem">No session ID provided. Check the link you were sent.</div>';
    return;
  }

  // Loading state
  container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:60vh;color:var(--text-muted);font-size:1rem">Loading interview...</div>';

  let sessionData;
  try {
    sessionData = await apiCall(`/api/interview-sessions/${sessionId}`);
  } catch (e) {
    container.innerHTML = `<div style="padding:48px;text-align:center;color:var(--danger);font-size:1rem">Failed to load session: ${esc(e.message || 'Access denied or session not found')}</div>`;
    return;
  }

  if (!sessionData || !sessionData.session || !sessionData.questions) {
    container.innerHTML = '<div style="padding:48px;text-align:center;color:var(--danger);font-size:1rem">Session data not found.</div>';
    return;
  }

  const { session, questions } = sessionData;

  // If already submitted, show read-only
  if (session.status === 'submitted') {
    renderSubmittedView(container, session, questions);
    return;
  }

  // Internal state
  const scoreMap = {};
  const notesMap = {};
  let currentIndex = 0;
  let saving = false;

  // Seed from existing scores
  for (const q of questions) {
    if (q.score != null) scoreMap[q.question_id] = q.score;
    if (q.score_notes) notesMap[q.question_id] = q.score_notes;
  }

  function scoredCount() {
    return questions.filter(q => scoreMap[q.question_id] != null).length;
  }

  function categoryStats() {
    const stats = {};
    for (const q of questions) {
      const cat = q.category || 'other';
      if (!stats[cat]) stats[cat] = { total: 0, scored: 0 };
      stats[cat].total++;
      if (scoreMap[q.question_id] != null) stats[cat].scored++;
    }
    return stats;
  }

  async function saveScore(questionId, score, notes) {
    if (saving) return;
    saving = true;
    try {
      await apiCall(`/api/interview-scores/${sessionId}/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, notes: notes || null }),
      });
    } catch (e) {
      if (typeof toast === 'function') toast('Failed to save score', 'error');
    } finally {
      saving = false;
    }
  }

  function render() {
    const q = questions[currentIndex];
    const scored = scoredCount();
    const total = questions.length;
    const allScored = scored === total;
    const catStats = categoryStats();
    const currentScore = scoreMap[q.question_id];
    const currentNotes = notesMap[q.question_id] || '';

    let html = `<div style="min-height:100vh;display:flex;flex-direction:column;background:var(--bg-base);color:var(--text-primary)">`;

    // Header bar
    html += `<div style="display:flex;align-items:center;gap:12px;padding:12px 20px;background:var(--bg-card);border-bottom:1px solid var(--border-default);flex-shrink:0">
      <div style="flex:1;min-width:0">
        <div style="font-size:0.95rem;font-weight:600">${esc(session.candidate_name || 'Candidate')}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${esc(session.candidate_role || '')}${session.client_name ? ' · ' + esc(session.client_name) : ''}</div>
      </div>
      <div style="font-size:0.82rem;color:var(--text-muted);font-weight:600">${scored} / ${total}</div>
      <button class="btn btn--sm" onclick="window._ivSaveAndExit()" style="background:var(--bg-surface);border:1px solid var(--border-default)">Save &amp; Exit</button>
    </div>`;

    // Category progress bars
    html += '<div style="display:flex;gap:12px;padding:12px 20px;flex-wrap:wrap;background:var(--bg-card);border-bottom:1px solid var(--border-default)">';
    for (const cat of Object.keys(catStats)) {
      const s = catStats[cat];
      const pct = s.total > 0 ? (s.scored / s.total) * 100 : 0;
      const colour = CATEGORY_COLOURS[cat] || 'var(--text-muted)';
      html += `<div style="flex:1;min-width:100px">
        <div style="font-size:0.65rem;font-weight:600;color:${colour};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px">${CATEGORY_LABELS[cat] || cat} ${s.scored}/${s.total}</div>
        <div style="height:4px;background:var(--bg-surface);border-radius:2px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${colour};border-radius:2px;transition:width 0.3s ease"></div>
        </div>
      </div>`;
    }
    html += '</div>';

    // Question display
    html += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 20px;max-width:720px;margin:0 auto;width:100%">`;

    // Category badge + question number
    const catColour = CATEGORY_COLOURS[q.category] || 'var(--text-muted)';
    html += `<div style="margin-bottom:16px;display:flex;align-items:center;gap:8px">
      <span style="background:${catColour};color:#fff;padding:3px 10px;border-radius:12px;font-size:0.7rem;font-weight:700;text-transform:uppercase">${CATEGORY_LABELS[q.category] || q.category}</span>
      <span style="font-size:0.78rem;color:var(--text-muted)">Question ${currentIndex + 1} of ${total}</span>
    </div>`;

    // Question text
    html += `<div style="font-size:1.25rem;font-weight:500;text-align:center;line-height:1.5;margin-bottom:32px;max-width:600px">${esc(q.question_text)}</div>`;

    // Score buttons
    html += '<div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;justify-content:center">';
    for (let s = 1; s <= 5; s++) {
      const isSelected = currentScore === s;
      const bgColour = isSelected ? '#14b8a6' : 'var(--bg-surface)';
      const textColour = isSelected ? '#fff' : 'var(--text-primary)';
      const border = isSelected ? '2px solid #14b8a6' : '2px solid var(--border-default)';
      html += `<button onclick="window._ivScore(${s})" style="
        width:72px;height:72px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
        background:${bgColour};color:${textColour};border:${border};cursor:pointer;transition:all 0.15s ease;font-family:inherit
      " onmouseover="if(!${isSelected})this.style.borderColor='#14b8a6'" onmouseout="if(!${isSelected})this.style.borderColor='var(--border-default)'">
        <span style="font-size:1.4rem;font-weight:700;line-height:1">${s}</span>
        <span style="font-size:0.6rem;font-weight:500;opacity:0.8">${SCORE_LABELS[s]}</span>
      </button>`;
    }
    html += '</div>';

    // Notes textarea
    html += `<div style="width:100%;max-width:500px;margin-bottom:24px">
      <textarea id="ivNotes" rows="2" placeholder="Optional notes..." onblur="window._ivSaveNotes()" style="
        width:100%;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);
        color:var(--text-primary);padding:10px;font-size:0.85rem;resize:vertical;font-family:inherit
      ">${esc(currentNotes)}</textarea>
    </div>`;

    // Navigation: Previous / Skip / Next
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">';
    html += `<button class="btn btn--sm" ${currentIndex === 0 ? 'disabled' : ''} onclick="window._ivNav(-1)" style="min-width:80px">&larr; Previous</button>`;
    html += `<button class="btn btn--sm" ${currentIndex >= total - 1 ? 'disabled' : ''} onclick="window._ivNav(1)" style="min-width:80px;background:transparent;border:1px solid var(--border-default);color:var(--text-muted)">Skip &rarr;</button>`;
    html += `<button class="btn btn--sm btn--primary" ${currentIndex >= total - 1 ? 'disabled' : ''} onclick="window._ivNav(1)" style="min-width:80px">Next &rarr;</button>`;
    html += '</div>';

    // Dot indicator
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;margin-bottom:24px">';
    for (let i = 0; i < total; i++) {
      const isActive = i === currentIndex;
      const isScored = scoreMap[questions[i].question_id] != null;
      let dotColour = 'var(--bg-surface)';
      if (isActive) dotColour = '#14b8a6';
      else if (isScored) dotColour = 'var(--success)';
      html += `<button onclick="window._ivGoTo(${i})" style="width:10px;height:10px;border-radius:50%;background:${dotColour};border:${isActive ? '2px solid #14b8a6' : '1px solid var(--border-default)'};cursor:pointer;padding:0" title="Question ${i + 1}${isScored ? ' (scored)' : ''}"></button>`;
    }
    html += '</div>';

    // Submit button
    if (allScored) {
      html += `<button class="btn btn--primary" onclick="window._ivSubmit()" style="padding:12px 32px;font-size:0.95rem;font-weight:600">Submit Scorecard</button>`;
    } else {
      html += `<div style="font-size:0.78rem;color:var(--text-muted)">${total - scored} question${total - scored !== 1 ? 's' : ''} remaining</div>`;
    }

    html += '</div></div>';
    container.innerHTML = html;
  }

  // Expose handlers
  window._ivScore = async (score) => {
    const q = questions[currentIndex];
    scoreMap[q.question_id] = score;
    render();
    await saveScore(q.question_id, score, notesMap[q.question_id] || null);
  };

  window._ivSaveNotes = async () => {
    const el = document.getElementById('ivNotes');
    if (!el) return;
    const q = questions[currentIndex];
    notesMap[q.question_id] = el.value;
    // Only save if there's already a score
    if (scoreMap[q.question_id] != null) {
      await saveScore(q.question_id, scoreMap[q.question_id], el.value || null);
    }
  };

  window._ivNav = (dir) => {
    // Save notes before navigating
    const el = document.getElementById('ivNotes');
    if (el) {
      const q = questions[currentIndex];
      notesMap[q.question_id] = el.value;
    }
    const newIdx = currentIndex + dir;
    if (newIdx >= 0 && newIdx < questions.length) {
      currentIndex = newIdx;
      render();
    }
  };

  window._ivGoTo = (idx) => {
    // Save notes before navigating
    const el = document.getElementById('ivNotes');
    if (el) {
      const q = questions[currentIndex];
      notesMap[q.question_id] = el.value;
    }
    if (idx >= 0 && idx < questions.length) {
      currentIndex = idx;
      render();
    }
  };

  window._ivSubmit = async () => {
    if (scoredCount() < questions.length) {
      if (typeof toast === 'function') toast('Please score all questions first', 'error');
      return;
    }
    const ok = typeof themedConfirm === 'function'
      ? await themedConfirm('Submit your scorecard?\nYou will not be able to change scores after submission.', 'Submit Scorecard', 'Submit')
      : confirm('Submit your scorecard? You will not be able to change scores after submission.');
    if (!ok) return;
    try {
      await apiCall(`/api/interview-sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (typeof toast === 'function') toast('Scorecard submitted!');
      // Reload to show submitted state
      renderInterviewMode(container, sessionId);
    } catch (e) {
      if (typeof toast === 'function') toast('Failed to submit: ' + (e.message || ''), 'error');
    }
  };

  window._ivSaveAndExit = () => {
    // Save any unsaved notes first
    const el = document.getElementById('ivNotes');
    if (el) {
      const q = questions[currentIndex];
      notesMap[q.question_id] = el.value;
      if (scoreMap[q.question_id] != null) {
        saveScore(q.question_id, scoreMap[q.question_id], el.value || null);
      }
    }
    window.location.hash = '#hiring';
  };

  render();
}

function renderSubmittedView(container, session, questions) {
  let html = `<div style="min-height:100vh;display:flex;flex-direction:column;background:var(--bg-base);color:var(--text-primary)">`;

  // Header
  html += `<div style="display:flex;align-items:center;gap:12px;padding:12px 20px;background:var(--bg-card);border-bottom:1px solid var(--border-default)">
    <div style="flex:1;min-width:0">
      <div style="font-size:0.95rem;font-weight:600">${esc(session.candidate_name || 'Candidate')}</div>
      <div style="font-size:0.75rem;color:var(--text-muted)">${esc(session.candidate_role || '')}${session.client_name ? ' · ' + esc(session.client_name) : ''}</div>
    </div>
    <span style="background:var(--success);color:#fff;padding:3px 10px;border-radius:12px;font-size:0.7rem;font-weight:700">SUBMITTED</span>
    <button class="btn btn--sm" onclick="window.location.hash='#hiring'" style="background:var(--bg-surface);border:1px solid var(--border-default)">Back to Hiring</button>
  </div>`;

  // Score summary
  const scored = questions.filter(q => q.score != null);
  const avg = scored.length > 0
    ? (scored.reduce((sum, q) => sum + q.score, 0) / scored.length).toFixed(1)
    : '--';

  html += `<div style="flex:1;max-width:720px;margin:0 auto;width:100%;padding:24px 20px">`;
  html += `<div style="text-align:center;margin-bottom:24px">
    <div style="font-size:2.5rem;font-weight:700;color:var(--success)">${avg}</div>
    <div style="font-size:0.82rem;color:var(--text-muted)">Your average score across ${scored.length} questions</div>
  </div>`;

  // Question list with scores
  html += '<div style="display:flex;flex-direction:column;gap:6px">';
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const catColour = CATEGORY_COLOURS[q.category] || 'var(--text-muted)';
    const scoreColour = q.score >= 4 ? 'var(--success)' : (q.score === 3 ? 'var(--warning)' : 'var(--danger)');
    html += `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--bg-card);border:1px solid var(--border-default);border-radius:var(--radius-sm)">
      <span style="font-size:0.7rem;font-weight:600;color:${catColour};text-transform:uppercase;min-width:80px;padding-top:2px">${CATEGORY_LABELS[q.category] || q.category}</span>
      <span style="flex:1;font-size:0.82rem;line-height:1.4">${esc(q.question_text)}</span>
      <span style="font-size:1.1rem;font-weight:700;color:${scoreColour};min-width:24px;text-align:right">${q.score != null ? q.score : '--'}</span>
    </div>`;
    if (q.score_notes) {
      html += `<div style="margin-left:90px;font-size:0.75rem;color:var(--text-muted);padding:0 12px 4px;font-style:italic">${esc(q.score_notes)}</div>`;
    }
  }
  html += '</div></div></div>';

  container.innerHTML = html;
}

registerView('interview', (container) => {
  const sessionId = window.location.hash.replace('#interview/', '');
  renderInterviewMode(container, sessionId);
});
