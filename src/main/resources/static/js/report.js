import { getState } from './state.js';
import { downloadPdfReport } from './api.js';
import { showToast } from './ui.js';

export function renderReport(containerEl) {
  if (!containerEl) return;
  const state = getState();
  const student = state.student;

  if (!student) {
    containerEl.innerHTML = `<p style="color: var(--ink-soft); text-align: center; padding: 40px;">Load student data to generate PDF report.</p>`;
    return;
  }

  const analysis = state.analysis;
  const simulation = state.simulation;

  const html = `
    <div class="panel">
      <div class="panel-title">
        <span>Academic Progress & Graduation PDF Report</span>
        <button id="download-pdf-btn" class="btn btn-primary">📄 Download Report (PDF)</button>
      </div>

      <p style="color: var(--ink-soft); font-size: 14px; margin-bottom: var(--space-md);">
        Generates an official document summary including credits earned/remaining, active backlogs, graduation what-if timelines, revaluation recommendations, and rule verification disclaimers.
      </p>

      <div style="border: 1px solid var(--line); border-radius: var(--radius-md); padding: var(--space-lg); background-color: #FAFBFD;">
        <h3 style="margin-bottom: 12px;">Report Summary Preview</h3>
        <ul class="ruled-list">
          <li class="ruled-row">
            <span class="ruled-label">Student Name</span>
            <span class="ruled-value">${escapeHtml(student.displayName)}</span>
          </li>
          <li class="ruled-row">
            <span class="ruled-label">Ruleset</span>
            <span class="ruled-value">${escapeHtml(student.rulesetCode)}</span>
          </li>
          <li class="ruled-row">
            <span class="ruled-label">Credits Earned / Required</span>
            <span class="ruled-value">${analysis ? `${analysis.creditsEarned} / ${analysis.creditsRequired}` : 'N/A'}</span>
          </li>
          <li class="ruled-row">
            <span class="ruled-label">Active Backlogs</span>
            <span class="ruled-value">${analysis ? analysis.backlogs.length : 0} paper(s)</span>
          </li>
          <li class="ruled-row">
            <span class="ruled-label">Fastest Projected Graduation</span>
            <span class="ruled-value">${simulation ? (simulation.scenarios[0]?.graduationDate || 'N/A') : 'N/A'}</span>
          </li>
        </ul>
      </div>
    </div>
  `;

  containerEl.innerHTML = html;

  const downloadBtn = containerEl.querySelector('#download-pdf-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      try {
        downloadBtn.disabled = true;
        downloadBtn.innerText = 'Generating PDF...';
        await downloadPdfReport(student, null);
        showToast('PDF report downloaded successfully');
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        downloadBtn.disabled = false;
        downloadBtn.innerText = '📄 Download Report (PDF)';
      }
    });
  }
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
