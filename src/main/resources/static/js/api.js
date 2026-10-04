export async function fetchRuleSets() {
  const res = await fetch('/api/rulesets');
  if (!res.ok) throw new Error('Failed to fetch rulesets');
  return res.json();
}

export async function fetchRuleSetByCode(code) {
  const res = await fetch(`/api/rulesets/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error(`Failed to fetch ruleset ${code}`);
  return res.json();
}

export async function fetchDemoStudent() {
  const res = await fetch('/api/demo-student');
  if (!res.ok) throw new Error('Failed to fetch demo student');
  return res.json();
}

export async function postAnalyze(student) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student)
  });
  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.details?.map(d => `${d.field}: ${d.problem}`).join('; ') || data.message || 'Analysis failed';
    throw new Error(errorMsg);
  }
  return data;
}

export async function postSimulate(student, scenarios = null) {
  const res = await fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student, scenarios })
  });
  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.details?.map(d => `${d.field}: ${d.problem}`).join('; ') || data.message || 'Simulation failed';
    throw new Error(errorMsg);
  }
  return data;
}

export async function postRevaluation(student) {
  const res = await fetch('/api/revaluation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student)
  });
  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.details?.map(d => `${d.field}: ${d.problem}`).join('; ') || data.message || 'Revaluation analysis failed';
    throw new Error(errorMsg);
  }
  return data;
}

export async function fetchDeadlines(rulesetCode) {
  const res = await fetch(`/api/deadlines?ruleset=${encodeURIComponent(rulesetCode)}`);
  if (!res.ok) throw new Error('Failed to fetch deadlines');
  return res.json();
}

export async function downloadPdfReport(student, scenarios = null) {
  const res = await fetch('/api/report/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student, scenarios })
  });
  if (!res.ok) throw new Error('Failed to generate PDF report');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'carryover_compass_report.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadIcsCalendar(rulesetCode) {
  const res = await fetch('/api/calendar/ics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rulesetCode })
  });
  if (!res.ok) throw new Error('Failed to generate ICS calendar');
  const text = await res.text();
  const blob = new Blob([text], { type: 'text/calendar' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'academic_deadlines.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
