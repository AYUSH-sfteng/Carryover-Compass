import { getState, setState } from './state.js';
import { showToast } from './ui.js';
import { postAnalyze } from './api.js';

export function renderBuilder(containerEl) {
  if (!containerEl) return;
  const state = getState();
  const student = state.student || getEmptyStudent();

  const rulesets = state.rulesets || [];

  const html = `
    <div class="panel">
      <div class="panel-title">
        <span>Student Profile</span>
        ${state.saveConfirmation ? '<span style="color: var(--ok); font-size: 13px; font-weight: 500;">✓ Saved to browser</span>' : ''}
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-md);">
        <div class="form-group">
          <label class="form-label" for="profile-name">Student Name</label>
          <input type="text" id="profile-name" class="form-control" value="${escapeHtml(student.displayName || 'Student')}" placeholder="e.g. Aarav">
        </div>
        <div class="form-group">
          <label class="form-label" for="profile-year">Admission Year</label>
          <select id="profile-year" class="form-control">
            ${[2021, 2022, 2023, 2024, 2025, 2026].map(y => `<option value="${y}" ${student.admissionYear === y ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="profile-ruleset">Rules Registry</label>
          <select id="profile-ruleset" class="form-control">
            ${rulesets.map(r => `<option value="${r.code}" ${student.rulesetCode === r.code ? 'selected' : ''}>${r.code} (${r.university} ${r.program})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="profile-last-sem">Last Completed Semester</label>
          <select id="profile-last-sem" class="form-control">
            ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(s => `<option value="${s}" ${student.lastCompletedSemester === s ? 'selected' : ''}>Semester ${s}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <span>Semester Results Builder</span>
      </div>
      <div id="semesters-accordion-container">
        ${renderSemestersAccordions(student, state.analysis)}
      </div>
    </div>
  `;

  containerEl.innerHTML = html;

  attachProfileEvents(containerEl, student);
  attachAccordionEvents(containerEl, student);
}

function getEmptyStudent() {
  return {
    displayName: "Student",
    rulesetCode: "AKTU_BTECH_SAMPLE",
    admissionYear: 2024,
    lastCompletedSemester: 0,
    subjects: []
  };
}

function renderSemestersAccordions(student, analysis) {
  let html = '';
  const lastSem = student.lastCompletedSemester || 0;

  for (let sem = 1; sem <= 8; sem++) {
    const isCompleted = sem <= lastSem;
    const semSubjects = (student.subjects || []).filter(s => s.semester === sem);
    
    let sgpaStr = "";
    if (analysis && analysis.sgpaBySemester && analysis.sgpaBySemester[sem - 1] !== null) {
      sgpaStr = `SGPA: ${analysis.sgpaBySemester[sem - 1].toFixed(2)}`;
    }

    let carryCount = 0;
    if (analysis && analysis.semesterStatus && analysis.semesterStatus[sem - 1]) {
      carryCount = analysis.semesterStatus[sem - 1].carryCount;
    }

    html += `
      <div class="accordion ${sem === 1 ? 'open' : ''}" data-sem="${sem}">
        <button class="accordion-header" type="button" aria-expanded="${sem === 1}">
          <div>
            <strong>Semester ${sem}</strong>
            <span style="color: var(--ink-soft); font-size: 13px; margin-left: 12px;">${isCompleted ? 'Completed' : 'Future/Unfinished'}</span>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <span style="font-weight: 600; font-size: 13px;">${sgpaStr}</span>
            ${carryCount > 0 ? `<span class="chip chip-carry">${carryCount} Carry</span>` : (isCompleted ? `<span class="chip chip-ok">Cleared</span>` : '')}
          </div>
        </button>
        <div class="accordion-content">
          ${renderSubjectTable(sem, semSubjects)}
          <button class="btn btn-secondary btn-sm add-subject-btn" data-sem="${sem}" style="margin-top: 12px;">+ Add Subject</button>
        </div>
      </div>
    `;
  }
  return html;
}

function renderSubjectTable(sem, subjects) {
  if (!subjects || subjects.length === 0) {
    return `<p style="color: var(--ink-soft); font-size: 13px;">No subjects added for Semester ${sem}. Click '+ Add Subject' below.</p>`;
  }

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Code</th>
          <th>Subject Name</th>
          <th>Credits</th>
          <th>Type</th>
          <th>Attempts</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${subjects.map((sub, idx) => `
          <tr>
            <td><input type="text" class="form-control sub-code" data-code="${sub.code}" value="${escapeHtml(sub.code)}" style="width: 100px;"></td>
            <td><input type="text" class="form-control sub-name" data-code="${sub.code}" value="${escapeHtml(sub.name)}" style="width: 200px;"></td>
            <td><input type="number" step="0.5" class="form-control sub-credits" data-code="${sub.code}" value="${sub.credits}" style="width: 70px;"></td>
            <td>
              <select class="form-control sub-type" data-code="${sub.code}">
                <option value="THEORY" ${sub.type === 'THEORY' ? 'selected' : ''}>Theory</option>
                <option value="PRACTICAL" ${sub.type === 'PRACTICAL' ? 'selected' : ''}>Practical</option>
              </select>
            </td>
            <td>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                ${(sub.attempts || []).map((att, aIdx) => `
                  <span class="chip ${att.grade === 'F' ? 'chip-risk' : 'chip-ok'}" title="${att.cycleLabel} - Marks: ${att.marksObtained ?? 'N/A'}">
                    ${att.cycleLabel}: ${att.grade} (${att.marksObtained ?? '-'})
                  </span>
                `).join('')}
                <button class="btn btn-secondary btn-sm add-attempt-btn" data-code="${sub.code}" style="padding: 2px 6px; font-size: 11px;">+ Attempt</button>
              </div>
            </td>
            <td>
              <button class="btn btn-danger btn-sm delete-sub-btn" data-code="${sub.code}">Remove</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function attachProfileEvents(containerEl, student) {
  const nameEl = containerEl.querySelector('#profile-name');
  const yearEl = containerEl.querySelector('#profile-year');
  const rulesetEl = containerEl.querySelector('#profile-ruleset');
  const lastSemEl = containerEl.querySelector('#profile-last-sem');

  const updateStudentProfile = async () => {
    const updated = {
      ...student,
      displayName: nameEl.value,
      admissionYear: parseInt(yearEl.value),
      rulesetCode: rulesetEl.value,
      lastCompletedSemester: parseInt(lastSemEl.value)
    };
    
    try {
      const analysis = await postAnalyze(updated);
      setState({ student: updated, analysis });
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  nameEl.addEventListener('change', updateStudentProfile);
  yearEl.addEventListener('change', updateStudentProfile);
  rulesetEl.addEventListener('change', updateStudentProfile);
  lastSemEl.addEventListener('change', updateStudentProfile);
}

function attachAccordionEvents(containerEl, student) {
  containerEl.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const acc = header.closest('.accordion');
      acc.classList.toggle('open');
      header.setAttribute('aria-expanded', acc.classList.contains('open'));
    });
  });

  containerEl.querySelectorAll('.add-subject-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sem = parseInt(btn.dataset.sem);
      const newCode = `SUB${sem}0${(student.subjects.filter(s => s.semester === sem).length + 1)}`;
      const newSub = {
        code: newCode,
        name: `New Subject ${sem}`,
        semester: sem,
        credits: 4.0,
        type: "THEORY",
        attempts: [
          { cycleLabel: `${student.admissionYear + Math.floor((sem-1)/2)} ${sem % 2 === 1 ? 'Odd' : 'Even'}`, grade: "B", marksObtained: 60, statusCode: "P" }
        ]
      };
      const updatedSubjects = [...(student.subjects || []), newSub];
      const updatedStudent = { ...student, subjects: updatedSubjects };

      try {
        const analysis = await postAnalyze(updatedStudent);
        setState({ student: updatedStudent, analysis });
        showToast('Subject added');
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  });

  containerEl.querySelectorAll('.delete-sub-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = btn.dataset.code;
      const updatedSubjects = (student.subjects || []).filter(s => s.code !== code);
      const updatedStudent = { ...student, subjects: updatedSubjects };

      try {
        const analysis = await postAnalyze(updatedStudent);
        setState({ student: updatedStudent, analysis });
        showToast('Subject removed');
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  });

  containerEl.querySelectorAll('.add-attempt-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = btn.dataset.code;
      const grade = prompt('Enter Grade (e.g. O, A+, A, B+, B, C, D, F):', 'F');
      if (!grade) return;
      const marksStr = prompt('Enter Marks Obtained (0..100, optional):', '35');
      const marks = marksStr ? parseInt(marksStr) : null;
      const cycleLabel = prompt('Enter Cycle Label (e.g. 2025 Carry):', '2025 Carry') || '2025 Carry';

      const updatedSubjects = (student.subjects || []).map(s => {
        if (s.code === code) {
          const attempts = [...(s.attempts || []), { cycleLabel, grade, marksObtained: marks, statusCode: grade === 'F' ? 'F' : 'P' }];
          return { ...s, attempts };
        }
        return s;
      });

      const updatedStudent = { ...student, subjects: updatedSubjects };

      try {
        const analysis = await postAnalyze(updatedStudent);
        setState({ student: updatedStudent, analysis });
        showToast('Attempt added');
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  });
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
