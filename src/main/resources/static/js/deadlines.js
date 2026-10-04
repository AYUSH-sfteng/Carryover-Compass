import { getState } from './state.js';
import { downloadIcsCalendar } from './api.js';
import { showToast } from './ui.js';

export function renderDeadlines(containerEl) {
  if (!containerEl) return;
  const state = getState();
  const deadlines = state.deadlines || [];
  const rulesetCode = state.student ? state.student.rulesetCode : "AKTU_BTECH_SAMPLE";

  const html = `
    <div class="panel">
      <div class="panel-title">
        <span>Upcoming Exam & Registration Deadlines</span>
        <button id="export-ics-btn" class="btn btn-secondary btn-sm">📅 Export Calendar (.ics)</button>
      </div>

      ${deadlines.length === 0 ? `
        <p style="color: var(--ink-soft);">Loading upcoming deadlines...</p>
      ` : `
        <div style="display: flex; flex-direction: column; gap: var(--space-md);">
          ${deadlines.map(item => `
            <div style="border: 1px solid var(--line); border-radius: var(--radius-md); padding: var(--space-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <div style="font-weight: 700; font-size: 16px;">${escapeHtml(item.label)}</div>
                <div style="color: var(--ink-soft); font-size: 13px;">
                  ${item.start ? `${item.start} to ${item.end}` : item.note}
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                ${item.approximate ? `<span class="chip chip-carry">Approximate</span>` : ''}
                ${item.daysLeft !== null && item.daysLeft !== undefined ? `
                  <span class="chip ${item.daysLeft <= 7 ? 'chip-risk' : 'chip-info'}">${item.daysLeft} days left</span>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  containerEl.innerHTML = html;

  const exportBtn = containerEl.querySelector('#export-ics-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        await downloadIcsCalendar(rulesetCode);
        showToast('Calendar (.ics) downloaded');
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  }
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
