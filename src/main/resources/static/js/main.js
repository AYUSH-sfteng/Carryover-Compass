import { getState, setState, subscribe, loadSavedStudent, clearSavedStudent } from './state.js';
import { fetchRuleSets, fetchRuleSetByCode, fetchDemoStudent, postAnalyze, postSimulate, postRevaluation, fetchDeadlines } from './api.js';
import { renderRouteMap } from './routemap.js';
import { renderBuilder } from './builder.js';
import { renderWhatIf } from './whatif.js';
import { renderRevaluation } from './revaluation.js';
import { renderDeadlines } from './deadlines.js';
import { renderReport } from './report.js';
import { showToast, openDrawer, closeDrawer } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  initTabNavigation();
  initHeaderActions();
  initDrawerEvents();

  // Load RuleSets list
  try {
    const rulesets = await fetchRuleSets();
    setState({ rulesets });
  } catch (e) {
    console.error('Failed to load rulesets:', e);
  }

  // Subscribe state updates to UI renderers
  subscribe(state => {
    updateActiveTabUI(state.activeTab);
    renderCompassTab(state);

    if (state.activeTab === 'builder') {
      renderBuilder(document.getElementById('pane-builder'));
    } else if (state.activeTab === 'whatif') {
      renderWhatIf(document.getElementById('pane-whatif'));
    } else if (state.activeTab === 'revaluation') {
      renderRevaluation(document.getElementById('pane-revaluation'));
    } else if (state.activeTab === 'deadlines') {
      renderDeadlines(document.getElementById('pane-deadlines'));
    } else if (state.activeTab === 'report') {
      renderReport(document.getElementById('pane-report'));
    }
  });

  // Load saved or demo student
  const savedStudent = loadSavedStudent();
  if (savedStudent) {
    loadStudentData(savedStudent);
  } else {
    // Show empty state
    renderEmptyState();
  }
});

async function loadStudentData(student) {
  try {
    const [analysis, simulation, revaluation, deadlines] = await Promise.all([
      postAnalyze(student),
      postSimulate(student, null),
      postRevaluation(student),
      fetchDeadlines(student.rulesetCode)
    ]);

    setState({
      student,
      analysis,
      simulation,
      revaluation,
      deadlines,
      selectedScenarioName: simulation.bestScenarioName
    });
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function renderEmptyState() {
  const paneCompass = document.getElementById('pane-compass');
  if (!paneCompass) return;

  paneCompass.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xl); align-items: center; padding: 40px 0;">
      <div>
        <h1 style="font-size: 36px; margin-bottom: 16px;">Apne backlog ka rasta dekho.</h1>
        <p style="color: var(--ink-soft); font-size: 18px; margin-bottom: 24px;">
          Result daalo, aur pata chalega degree kab tak milegi aur kya karna sahi rahega.
        </p>
        <div style="display: flex; gap: 12px;">
          <button id="empty-load-demo-btn" class="btn btn-primary">Load Demo Student</button>
          <button id="empty-start-my-results-btn" class="btn btn-secondary">Start With My Results</button>
        </div>
      </div>
      <div style="background-color: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 30px; text-align: center;">
        <svg viewBox="0 0 400 200" width="100%" height="200" opacity="0.4">
          <line x1="30" y1="100" x2="370" y2="100" stroke="var(--route)" stroke-width="4" />
          <circle cx="50" cy="100" r="10" fill="var(--route)" />
          <circle cx="130" cy="100" r="10" fill="var(--route)" />
          <circle cx="210" cy="100" r="10" fill="var(--route)" stroke="var(--carry)" stroke-width="4" />
          <path d="M 210 100 Q 220 130 250 140" stroke="var(--carry)" stroke-width="3" fill="none" />
          <rect x="235" y="128" width="50" height="24" fill="#FFF8E6" stroke="var(--carry)" rx="4" />
          <circle cx="290" cy="100" r="10" fill="var(--surface)" stroke="var(--route)" stroke-width="4" />
          <circle cx="370" cy="100" r="12" fill="var(--surface)" stroke="var(--route)" stroke-width="4" />
        </svg>
        <p style="color: var(--ink-soft); font-size: 13px; margin-top: 12px;">Sample Metro Route Map Preview</p>
      </div>
    </div>
  `;

  document.getElementById('empty-load-demo-btn')?.addEventListener('click', loadDemoStudentAction);
  document.getElementById('empty-start-my-results-btn')?.addEventListener('click', () => {
    const emptyStudent = {
      displayName: "Student",
      rulesetCode: "AKTU_BTECH_SAMPLE",
      admissionYear: 2024,
      lastCompletedSemester: 0,
      subjects: []
    };
    loadStudentData(emptyStudent);
    setState({ activeTab: 'builder' });
  });
}

async function loadDemoStudentAction() {
  try {
    const demo = await fetchDemoStudent();
    await loadStudentData(demo);
    showToast('Demo student loaded');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function renderCompassTab(state) {
  const paneCompass = document.getElementById('pane-compass');
  if (!paneCompass || !state.student) return;

  const analysis = state.analysis;
  const simulation = state.simulation;
  const selectedName = state.selectedScenarioName;

  paneCompass.innerHTML = `
    <div class="two-column-layout">
      <!-- Left Column: SVG Metro Route Map -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h2 style="font-size: 20px;">Degree Route Map</h2>
          ${state.saveConfirmation ? '<span style="color: var(--ok); font-size: 12px;">Saved to browser</span>' : ''}
        </div>
        <div id="routemap-svg-host" class="routemap-container"></div>
      </div>

      <!-- Right Column: Summary Panel -->
      <div>
        <div class="panel">
          <div class="panel-title">Degree Summary</div>
          <ul class="ruled-list">
            <li class="ruled-row">
              <span class="ruled-label">Credits Progress</span>
              <span class="ruled-value">${analysis ? `${analysis.creditsEarned} / ${analysis.creditsRequired}` : '0'}</span>
            </li>
            <div class="progress-bar-container" style="margin-bottom: 12px;">
              <div class="progress-bar-fill" style="width: ${analysis ? Math.min(100, (analysis.creditsEarned / analysis.creditsRequired) * 100) : 0}%;"></div>
            </div>

            <li class="ruled-row">
              <span class="ruled-label">Overall CGPA</span>
              <span class="ruled-value">${analysis && analysis.cgpa ? analysis.cgpa.toFixed(2) : 'N/A'}</span>
            </li>

            <li class="ruled-row">
              <span class="ruled-label">Active Backlogs</span>
              <span class="ruled-value">${analysis ? analysis.backlogs.length : 0} paper(s)</span>
            </li>

            <li class="ruled-row">
              <span class="ruled-label">Promotion Status</span>
              <span class="ruled-value">${analysis && analysis.promotion ? (analysis.promotion.canPromoteToNext ? '<span class="chip chip-ok">Eligible</span>' : '<span class="chip chip-risk">Blocked</span>') : '-'}</span>
            </li>

            <li class="ruled-row">
              <span class="ruled-label">Risk Level</span>
              <span class="ruled-value">
                ${analysis && analysis.risk ? renderRiskChip(analysis.risk.level) : '-'}
              </span>
            </li>
          </ul>

          ${analysis && analysis.risk && analysis.risk.reasons ? `
            <div style="margin-top: 12px;">
              <span style="font-size: 13px; font-weight: 600; color: var(--ink-soft);">Risk Reasons:</span>
              <ul style="padding-left: 18px; font-size: 13px; color: var(--ink-soft); margin-top: 4px;">
                ${analysis.risk.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>

        <div class="panel">
          <div class="panel-title">Next Best Action</div>
          <p style="font-size: 14px; font-weight: 500; color: var(--ink);">
            ${computeNextBestAction(analysis)}
          </p>
        </div>
      </div>
    </div>
  `;

  renderRouteMap(document.getElementById('routemap-svg-host'), analysis, simulation, selectedName);
}

function computeNextBestAction(analysis) {
  if (!analysis) return "Result input karo sabse pehle.";
  if (analysis.backlogs.length === 0) {
    return "Bahut badiya! Abhi koi backlog nahi. Regular semester exams par dhyan do.";
  }
  const firstBacklog = analysis.backlogs[0];
  return `Pehle ${firstBacklog.code} (${firstBacklog.name}) clear karo, wahi promotion limit ke sabse kareeb rakhte hain.`;
}

function renderRiskChip(level) {
  if (level === 'HIGH') return `<span class="chip chip-risk">HIGH RISK</span>`;
  if (level === 'MEDIUM') return `<span class="chip chip-carry">MEDIUM RISK</span>`;
  return `<span class="chip chip-ok">LOW RISK</span>`;
}

function initTabNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const tab = tabBtn.dataset.tab;
      setState({ activeTab: tab });
    });
  });
}

function updateActiveTabUI(activeTab) {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === activeTab);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `pane-${activeTab}`);
  });
}

function initHeaderActions() {
  document.getElementById('btn-load-demo')?.addEventListener('click', loadDemoStudentAction);

  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    const student = getState().student;
    if (!student) {
      showToast('No student data to export', 'error');
      return;
    }
    const json = JSON.stringify(student, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.displayName || 'student'}_results.json`;
    a.click();
    a.remove();
    showToast('JSON exported');
  });

  document.getElementById('btn-import-json')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async event => {
          try {
            const student = JSON.parse(event.target.result);
            await loadStudentData(student);
            showToast('JSON imported successfully');
          } catch (err) {
            showToast('Invalid JSON file format', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  });

  document.getElementById('btn-rules-drawer')?.addEventListener('click', async () => {
    const student = getState().student;
    const code = student ? student.rulesetCode : "AKTU_BTECH_SAMPLE";
    try {
      const rs = await fetchRuleSetByCode(code);
      const content = `
        <div style="font-size: 14px;">
          <p><strong>Code:</strong> ${rs.code}</p>
          <p><strong>University:</strong> ${rs.university} (${rs.program})</p>
          <p><strong>Verified:</strong> ${rs.verified ? 'Yes' : '<span style="color: var(--carry);">False (Sample Rules)</span>'}</p>
          <p><strong>Total Credits Required:</strong> ${rs.totalCreditsRequired}</p>
          <p><strong>Default Carry Limit:</strong> ${rs.promotion.defaultMaxCarryPapers} papers</p>
          <p><strong>Revaluation Fee:</strong> ₹${rs.revaluation.feePerPaperINR} / paper</p>
          <pre style="background: #F2F5F9; padding: 12px; border-radius: 6px; font-size: 11px; overflow-x: auto; margin-top: 12px;">${JSON.stringify(rs, null, 2)}</pre>
        </div>
      `;
      openDrawer("Rules Registry Definition", content);
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}

function initDrawerEvents() {
  document.getElementById('drawer-close-btn')?.addEventListener('click', closeDrawer);
  document.getElementById('drawer-overlay')?.addEventListener('click', closeDrawer);
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
