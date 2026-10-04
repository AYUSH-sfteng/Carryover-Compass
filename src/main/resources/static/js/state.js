const STORAGE_KEY = 'carryover_compass_student';

let state = {
  student: null,
  analysis: null,
  simulation: null,
  revaluation: null,
  deadlines: [],
  selectedScenarioName: null,
  activeTab: 'compass',
  rulesets: [],
  selectedRuleSetFull: null,
  saveConfirmation: false
};

const listeners = new Set();
let saveTimeout = null;

export function getState() {
  return state;
}

export function setState(partialState) {
  state = { ...state, ...partialState };
  
  if (partialState.student !== undefined && partialState.student !== null) {
    scheduleAutosave(state.student);
  }

  notify();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach(fn => fn(state));
}

function scheduleAutosave(student) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(student));
      state.saveConfirmation = true;
      notify();
      setTimeout(() => {
        state.saveConfirmation = false;
        notify();
      }, 2000);
    } catch (e) {
      console.warn('localStorage autosave failed:', e);
    }
  }, 400);
}

export function loadSavedStudent() {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (json) {
      return JSON.parse(json);
    }
  } catch (e) {
    console.warn('Failed to parse saved student:', e);
  }
  return null;
}

export function clearSavedStudent() {
  localStorage.removeItem(STORAGE_KEY);
  setState({ student: null, analysis: null, simulation: null, revaluation: null });
}
