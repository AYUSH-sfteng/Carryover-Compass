import { getState, setState } from './state.js';
import { postSimulate } from './api.js';
import { showToast } from './ui.js';

let debounceTimeout = null;

export function renderWhatIf(containerEl) {
  if (!containerEl) return;
  const state = getState();
  const student = state.student;

  if (!student) {
    containerEl.innerHTML = `<p style="color: var(--ink-soft); text-align: center; padding: 40px;">Load student data to run What-If simulations.</p>`;
    return;
  }

  const simulation = state.simulation;
  const scenarios = simulation ? simulation.scenarios : [];
  const selectedName = state.selectedScenarioName || (simulation ? simulation.bestScenarioName : null);

  const html = `
    <div class="two-column-layout">
      <!-- Left Column: Controls -->
      <div class="panel">
        <div class="panel-title">Simulation Controls</div>

        <div class="form-group">
          <label class="form-label" for="clears-slider">
            Papers I can clear per cycle: <span id="clears-val" style="font-weight: 700; color: var(--route);">2</span>
          </label>
          <input type="range" id="clears-slider" class="form-control" min="0" max="6" value="2" style="cursor: pointer;">
        </div>

        <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="skip-next-toggle" style="width: 18px; height: 18px; cursor: pointer;">
          <label for="skip-next-toggle" style="cursor: pointer; font-weight: 500;">I will skip the next exam cycle</label>
        </div>

        <div style="margin-top: 24px;">
          <button id="reset-sim-btn" class="btn btn-secondary" style="width: 100%;">Reset to Default Plans</button>
        </div>
      </div>

      <!-- Right Column: Parallel Plan Cards -->
      <div>
        <div style="margin-bottom: 16px; font-weight: 700; font-size: 18px;">Compare Graduation Scenarios</div>
        <div id="plans-container">
          ${renderPlanCards(scenarios, selectedName, simulation ? simulation.bestScenarioName : null)}
        </div>
      </div>
    </div>
  `;

  containerEl.innerHTML = html;

  attachControlsEvents(containerEl, student);
  attachPlanCardEvents(containerEl);
}

function renderPlanCards(scenarios, selectedName, bestName) {
  if (!scenarios || scenarios.length === 0) {
    return `<p style="color: var(--ink-soft);">Running simulation engine...</p>`;
  }

  return scenarios.map(sc => {
    const isSelected = sc.scenarioName === selectedName;
    const isBest = sc.scenarioName === bestName;

    let dateDisplay = "Degree: TBD";
    let statusDisplay = "";

    if (sc.exceedsMaxDuration || !sc.graduationDate) {
      dateDisplay = "Degree: Exceeds Limit";
      statusDisplay = `<span class="chip chip-risk">Duration Limit Cross</span>`;
    } else {
      const gDate = new Date(sc.graduationDate);
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      dateDisplay = `Degree: ${months[gDate.getMonth()]} ${gDate.getFullYear()}`;

      if (sc.monthsLateVsOnTime === 0) {
        statusDisplay = `<span class="chip chip-ok">On Time</span>`;
      } else {
        statusDisplay = `<span class="chip chip-risk">${sc.monthsLateVsOnTime} Months Late</span>`;
      }
    }

    return `
      <div class="plan-card ${isSelected ? 'selected' : ''}" data-name="${escapeHtml(sc.scenarioName)}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 700; font-size: 16px;">${escapeHtml(sc.scenarioName)}</span>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${isBest ? `<span class="chip chip-ok">⚡ Fastest</span>` : ''}
            ${statusDisplay}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
          <span style="color: var(--ink-soft);">Clears/cycle: ${sc.clearsPerCycle}</span>
          <span style="font-weight: 700; color: var(--ink);">${dateDisplay}</span>
        </div>
        ${sc.warning ? `<p style="color: var(--risk); font-size: 12px; margin-top: 6px;">⚠️ ${sc.warning}</p>` : ''}
      </div>
    `;
  }).join('');
}

function attachControlsEvents(containerEl, student) {
  const slider = containerEl.querySelector('#clears-slider');
  const clearsVal = containerEl.querySelector('#clears-val');
  const skipToggle = containerEl.querySelector('#skip-next-toggle');
  const resetBtn = containerEl.querySelector('#reset-sim-btn');

  const triggerCustomSimulation = () => {
    const clears = parseInt(slider.value);
    clearsVal.innerText = clears;

    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      const customScenarios = [
        { name: "Plan A (ASAP)", clearsPerCycle: 6, skipCycleIndexes: [], regularSemestersPass: true },
        { name: `Custom (${clears} papers/cycle)`, clearsPerCycle: clears, skipCycleIndexes: skipToggle.checked ? [0] : [], regularSemestersPass: true },
        { name: "Plan C (Steady Skip Next)", clearsPerCycle: 2, skipCycleIndexes: [0], regularSemestersPass: true }
      ];

      try {
        const simulation = await postSimulate(student, customScenarios);
        setState({ simulation, selectedScenarioName: `Custom (${clears} papers/cycle)` });
      } catch (e) {
        showToast(e.message, 'error');
      }
    }, 300);
  };

  slider.addEventListener('input', triggerCustomSimulation);
  skipToggle.addEventListener('change', triggerCustomSimulation);

  resetBtn.addEventListener('click', async () => {
    slider.value = 2;
    clearsVal.innerText = '2';
    skipToggle.checked = false;
    try {
      const simulation = await postSimulate(student, null);
      setState({ simulation, selectedScenarioName: simulation.bestScenarioName });
      showToast('Reset to default plans');
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}

function attachPlanCardEvents(containerEl) {
  containerEl.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.name;
      setState({ selectedScenarioName: name });
      showToast(`Selected plan: ${name}`);
    });
  });
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
