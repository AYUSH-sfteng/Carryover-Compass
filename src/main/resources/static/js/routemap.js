export function renderRouteMap(containerEl, analysis, simulation, selectedScenarioName) {
  if (!containerEl) return;

  if (!analysis) {
    containerEl.innerHTML = `<p style="color: var(--ink-soft); text-align: center; padding: 40px;">Load student data to render Metro Route Map.</p>`;
    return;
  }

  const isMobile = window.innerWidth < 640;
  const svgWidth = isMobile ? 320 : 900;
  const svgHeight = isMobile ? 650 : 340;

  // Station coordinates along main route line
  const totalSemesters = 8;
  const startX = isMobile ? 60 : 50;
  const endX = isMobile ? 60 : 820;
  const startY = isMobile ? 40 : 140;
  const endY = isMobile ? 580 : 140;

  const stepX = (endX - startX) / totalSemesters;
  const stepY = (endY - startY) / totalSemesters;

  // Calculate degree date string & status
  let selectedScenario = null;
  if (simulation && simulation.scenarios) {
    selectedScenario = simulation.scenarios.find(s => s.scenarioName === selectedScenarioName) || simulation.scenarios[0];
  }

  let degreeDateStr = "Degree: TBD";
  let degreeStatusHtml = "";

  if (selectedScenario) {
    if (selectedScenario.exceedsMaxDuration || !selectedScenario.graduationDate) {
      degreeDateStr = "Degree: Not Possible";
      degreeStatusHtml = `<tspan fill="var(--risk)" dy="16" x="${endX + (isMobile ? 0 : 40)}">Duration ke andar possible nahi</tspan>`;
    } else {
      const gDate = new Date(selectedScenario.graduationDate);
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      degreeDateStr = `Degree: ${monthNames[gDate.getMonth()]} ${gDate.getFullYear()}`;
      
      const monthsLate = selectedScenario.monthsLateVsOnTime;
      if (monthsLate === 0) {
        degreeStatusHtml = `<tspan fill="var(--ok)" dy="16" x="${endX + (isMobile ? 0 : 40)}">On time</tspan>`;
      } else {
        degreeStatusHtml = `<tspan fill="var(--risk)" dy="16" x="${endX + (isMobile ? 0 : 40)}">${monthsLate} mahine late</tspan>`;
      }
    }
  }

  let svgElements = [];
  let screenReaderText = [];

  // Main route line segments
  let lastCompletedSem = 0;
  analysis.semesterStatus.forEach(ss => {
    if (ss.status === 'CLEARED' || ss.status === 'HAS_CARRY') {
      lastCompletedSem = Math.max(lastCompletedSem, ss.semester);
    }
  });

  // Solid line up to completed sem
  const solidEndX = startX + (lastCompletedSem > 0 ? lastCompletedSem - 1 : 0) * stepX;
  const solidEndY = startY + (lastCompletedSem > 0 ? lastCompletedSem - 1 : 0) * stepY;

  svgElements.push(`
    <line class="route-line-future" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" />
    <line class="route-line" x1="${startX}" y1="${startY}" x2="${solidEndX}" y2="${solidEndY}" />
  `);

  // Stations 1 to 8
  analysis.semesterStatus.forEach((ss, idx) => {
    const sem = ss.semester;
    const cx = startX + (sem - 1) * stepX;
    const cy = startY + (sem - 1) * stepY;

    let circleClass = "future";
    let statusLabel = `Sem ${sem}`;
    let ariaDesc = `Semester ${sem}: Future`;

    if (ss.status === 'CLEARED') {
      circleClass = "cleared";
      statusLabel = `Sem ${sem} done`;
      ariaDesc = `Semester ${sem}: Cleared`;
    } else if (ss.status === 'HAS_CARRY') {
      circleClass = "has-carry";
      statusLabel = `Sem ${sem} carry (${ss.carryCount})`;
      ariaDesc = `Semester ${sem}: Has ${ss.carryCount} backlog paper(s)`;
    } else if (ss.status === 'CURRENT') {
      circleClass = "current";
      statusLabel = `Sem ${sem} active`;
      ariaDesc = `Semester ${sem}: Currently active`;
    }

    screenReaderText.push(ariaDesc);

    // Render station node
    const radius = ss.status === 'CURRENT' ? 10 : 8;
    svgElements.push(`
      <circle class="station-circle ${circleClass}" cx="${cx}" cy="${cy}" r="${radius}" />
      <text class="station-label" x="${cx}" y="${cy - (isMobile ? 0 : 20)}">${statusLabel}</text>
    `);

    // Render backlog spur line if HAS_CARRY
    if (ss.status === 'HAS_CARRY') {
      const spurEndX = cx + (isMobile ? 80 : 30);
      const spurEndY = cy + (isMobile ? 0 : 60);

      // Backlog subject codes for this sem
      const semBacklogs = analysis.backlogs.filter(b => b.semester === sem);
      const codes = semBacklogs.map(b => b.code);
      const displayCodes = codes.slice(0, 3).join(", ") + (codes.length > 3 ? ` +${codes.length - 3}` : "");

      svgElements.push(`
        <path class="spur-line" d="M ${cx} ${cy} Q ${cx + 15} ${cy + 30} ${spurEndX} ${spurEndY}" />
        <rect class="spur-box" x="${spurEndX - 35}" y="${spurEndY - 14}" width="70" height="24" />
        <text class="spur-text" x="${spurEndX}" y="${spurEndY + 2}">${displayCodes}</text>
      `);
    }
  });

  // Terminal "Degree" station
  const termX = endX + (isMobile ? 0 : 40);
  const termY = endY + (isMobile ? 40 : 0);
  svgElements.push(`
    <circle class="terminal-degree" cx="${endX}" cy="${endY}" r="12" />
    <text class="station-label" x="${termX}" y="${termY - 10}">${degreeDateStr}</text>
    <text class="station-sublabel" x="${termX}" y="${termY}">${degreeStatusHtml}</text>
  `);

  // What-if projected stops overlay on future line
  if (selectedScenario && selectedScenario.timeline) {
    selectedScenario.timeline.forEach(event => {
      if (event.eventType === 'PROGRESS') {
        // Overlay marker along future route
        svgElements.push(`
          <!-- What-if projected marker -->
        `);
      }
    });
  }

  containerEl.innerHTML = `
    <svg class="routemap-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="Metro Route Map to Graduation">
      ${svgElements.join('')}
    </svg>
    <div class="sr-only">
      <h4>Degree Path Progress Summary</h4>
      <ul>
        ${screenReaderText.map(t => `<li>${t}</li>`).join('')}
        <li>${degreeDateStr}</li>
      </ul>
    </div>
  `;
}
