export function validateSubjectInput(code, name, semester, credits) {
  const errors = [];
  if (!code || !code.trim()) errors.push('Subject code is required');
  if (!name || !name.trim()) errors.push('Subject name is required');
  if (!semester || semester < 1 || semester > 8) errors.push('Semester must be 1 to 8');
  if (!credits || credits <= 0 || credits > 6) errors.push('Credits must be > 0 and <= 6');
  return errors;
}

export function validateAttemptInput(cycleLabel, grade, marks) {
  const errors = [];
  if (!cycleLabel || !cycleLabel.trim()) errors.push('Cycle label is required');
  if (!grade || !grade.trim()) errors.push('Grade is required');
  if (marks !== null && marks !== undefined && (marks < 0 || marks > 100)) {
    errors.push('Marks must be between 0 and 100');
  }
  return errors;
}
