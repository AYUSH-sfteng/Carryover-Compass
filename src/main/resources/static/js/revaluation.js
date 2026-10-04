import { getState, setState } from './state.js';

export function renderRevaluation(containerEl) {
  if (!containerEl) return;
  const state = getState();
  const reval = state.revaluation;

  if (!reval) {
    containerEl.innerHTML = `<p style="color: var(--ink-soft); text-align: center; padding: 40px;">Load student data to view Revaluation advice.</p>`;
    return;
  }

  const adviceItems = reval.adviceItems || [];

  const html = `
    <div class="panel">
      <div class="panel-title">Revaluation Advisor (Paid Recheck Evaluation)</div>
      <p style="color: var(--ink-soft); font-size: 14px; margin-bottom: var(--space-md);">
        Evaluates backlog papers against pass thresholds to advise whether rechecking (revaluation) is worth considering.
      </p>

      ${adviceItems.length === 0 ? `
        <p style="color: var(--ok); font-weight: 600; padding: 20px 0;">Abhi koi backlog nahi. Revaluation ki zaroorat nahi hai.</p>
      ` : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Subject Code</th>
              <th>Subject Name</th>
              <th>Marks Obtained</th>
              <th>Passing Threshold</th>
              <th>Gap</th>
              <th>Verdict</th>
              <th>Fee (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${adviceItems.map(item => `
              <tr>
                <td><strong>${escapeHtml(item.code)}</strong></td>
                <td>${escapeHtml(item.name)}</td>
                <td>${item.marksObtained !== null ? item.marksObtained : '<button class="btn btn-secondary btn-sm jump-marks-btn">Add Marks</button>'}</td>
                <td>${item.passMark}</td>
                <td>${item.gap !== null ? item.gap : '-'}</td>
                <td>${renderVerdictChip(item.verdict)}</td>
                <td>₹${item.feeINR}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="ruled-row" style="margin-top: 16px;">
          <span class="ruled-label">Total Revaluation Fee for "Worth Considering" Papers</span>
          <span class="ruled-value" style="font-size: 18px; color: var(--route);">₹${reval.totalFeeINR}</span>
        </div>

        <div class="disclaimer-banner" style="margin-top: 16px;">
          ⚠️ ${escapeHtml(reval.heuristicNote || "Heuristic hai. Revaluation se marks badhne ki guarantee nahi.")}
        </div>
      `}
    </div>
  `;

  containerEl.innerHTML = html;

  containerEl.querySelectorAll('.jump-marks-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setState({ activeTab: 'builder' });
    });
  });
}

function renderVerdictChip(verdict) {
  if (verdict === 'WORTH_CONSIDERING') {
    return `<span class="chip chip-ok">Worth Considering</span>`;
  }
  if (verdict === 'UNLIKELY_TO_HELP') {
    return `<span class="chip chip-risk">Unlikely to Help</span>`;
  }
  return `<span class="chip chip-carry">Need Marks</span>`;
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
