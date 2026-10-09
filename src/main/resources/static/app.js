let state = {
    student: null,
    rules: null,
    analysis: null,
    demoStudent: null
};

document.addEventListener('DOMContentLoaded', async () => {
    // Title animation
    const title = document.getElementById('heroTitle');
    const text = title.innerText;
    title.innerHTML = text.split(' ').map(w => `<span class="word">${w}</span>`).join(' ');
    
    // Fetch rules
    try {
        const res = await fetch('/api/rules');
        state.rules = await res.json();
    } catch(e) { console.error("Could not load rules", e); }

    // Fetch demo student to pre-fill drawer
    try {
        const res = await fetch('/api/demo');
        state.demoStudent = await res.json();
    } catch(e) { console.error("Could not load demo student", e); }

    // Loader out
    setTimeout(() => {
        document.getElementById('loader').style.transform = 'translateY(-100%)';
        document.querySelectorAll('.word').forEach((el, i) => {
            setTimeout(() => { el.style.opacity = 1; el.style.transform = 'translateY(0)'; }, i * 100);
        });
    }, 900);

    // Cursor glow
    const cursor = document.getElementById('cursorGlow');
    document.addEventListener('mousemove', e => {
        cursor.style.opacity = 1;
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    // Hover tilt
    document.querySelectorAll('.tilt').forEach(el => {
        el.addEventListener('mousemove', e => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xc = rect.width / 2;
            const yc = rect.height / 2;
            const dx = x - xc;
            const dy = y - yc;
            el.style.transform = `perspective(500px) rotateY(${dx / 20}deg) rotateX(${-dy / 20}deg)`;
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'perspective(500px) rotateY(0) rotateX(0)';
        });
    });

    // Magnetic buttons
    document.querySelectorAll('.magnetic').forEach(btn => {
        btn.addEventListener('mousemove', e => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width/2;
            const y = e.clientY - rect.top - rect.height/2;
            btn.style.transform = `translate(${x*0.2}px, ${y*0.2}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });

    // Scroll route animation
    window.addEventListener('scroll', () => {
        const routeSec = document.querySelector('.route-section');
        const fill = document.getElementById('mainRouteFill');
        if(routeSec && fill) {
            const rect = routeSec.getBoundingClientRect();
            const scrollRatio = Math.max(0, Math.min(1, -rect.top / (rect.height - window.innerHeight)));
            const dash = 1000;
            fill.style.strokeDashoffset = dash - (dash * scrollRatio);
        }
    });

    const saved = localStorage.getItem('compass.student.v2');
    if (saved) {
        state.student = JSON.parse(saved);
        analyze();
    } else if (state.demoStudent) {
        populateDrawer(state.demoStudent);
    }
});

async function loadDemo() {
    try {
        const res = await fetch('/api/demo');
        state.student = await res.json();
        localStorage.setItem('compass.student.v2', JSON.stringify(state.student));
        analyze();
    } catch(e) { alert("Failed to load demo"); }
}

async function analyze(clears = 2) {
    if (!state.student) return;
    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({student: state.student, clearsPerCycle: parseInt(clears)})
        });
        if (!res.ok) {
            const errs = await res.json();
            alert("Errors: " + errs.join('\n'));
            return;
        }
        state.analysis = await res.json();
        render();
    } catch(e) { console.error(e); alert("Analysis failed."); }
}

function render() {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
    
    const a = state.analysis;
    
    // Credits
    document.getElementById('creditsEarned').innerText = a.creditsEarned;
    document.getElementById('creditsReq').innerText = a.creditsRequired;
    const ring = document.getElementById('creditsRing');
    const pct = Math.min(1, a.creditsEarned / a.creditsRequired);
    setTimeout(() => { ring.style.strokeDashoffset = 283 - (283 * pct); }, 100);

    // Basic stats
    document.getElementById('cgpaVal').innerText = a.cgpa.toFixed(2);
    document.getElementById('backlogCount').innerText = a.backlogs.length;
    
    const bChips = document.getElementById('backlogChips');
    bChips.innerHTML = a.backlogs.map(b => `<span class="chip amber">${b.code}</span>`).join(' ');

    let pMsg = a.promotion.message;
    if (state.student.lastCompletedSemester === state.rules.semesterCount) {
        pMsg = 'Saare semester complete. Degree ke liye backlogs clear karne hain.';
    }
    document.getElementById('promoStatus').innerText = pMsg;
    const rBadge = document.getElementById('riskBadge');
    rBadge.innerText = a.risk.level.charAt(0).toUpperCase() + a.risk.level.slice(1).toLowerCase() + ' risk';
    rBadge.className = 'badge risk-' + a.risk.level;
    document.getElementById('riskReasons').innerHTML = a.risk.reasons.map(r => `<li>${r}</li>`).join('');

    document.getElementById('nextActionText').innerText = a.nextAction;

    // Route map
    const stContainer = document.getElementById('routeStations');
    let stHtml = '';
    a.semesters.forEach(s => {
        let cls = s.status === 'CLEARED' ? 'cleared' : s.status === 'FUTURE' ? 'future' : 'carry';
        let spur = s.status === 'HAS_CARRY' ? `<div class="spur">${s.carryCodes.join(', ')}</div>` : '';
        stHtml += `<div class="station ${cls}"><div class="station-dot"></div>${spur}<div class="station-label">Sem ${s.n}</div></div>`;
    });
    // Add degree terminal
    const bestPlan = a.plans[0];
    let termText = bestPlan.monthsLate > 0 ? `${bestPlan.monthsLate} mo late` : `On time`;
    stHtml += `<div class="station future"><div class="station-dot" style="border-radius:0;"></div><div class="station-label">Degree<br>${termText}</div></div>`;
    stContainer.innerHTML = stHtml;

    // Plans
    // Sort plans by graduation date to find the fastest
    let fastestPlanIndex = -1;
    let minDate = Infinity;
    a.plans.forEach((p, i) => {
        if (p.graduation) {
            let d = new Date(p.graduation).getTime();
            if (d < minDate) { minDate = d; fastestPlanIndex = i; }
        }
    });

    const pCont = document.getElementById('plansContainer');
    pCont.innerHTML = a.plans.map((p, i) => {
        let dateStr = 'N/A';
        if (p.graduation) {
            const d = new Date(p.graduation);
            const m = d.toLocaleString('en-US', { month: 'short' });
            dateStr = m + ' ' + d.getFullYear();
        }
        
        let lateText = p.monthsLate === 0 ? 'On time' : '+' + p.monthsLate + ' month' + (p.monthsLate === 1 ? '' : 's') + ' late';
        
        // Progress bar: length is proportional to months until graduation
        let msUntil = p.graduation ? new Date(p.graduation).getTime() - new Date().getTime() : 0;
        let monthsUntil = Math.max(0, msUntil / (1000 * 60 * 60 * 24 * 30));
        let maxMonths = 36;
        let pct = p.graduation ? Math.max(10, 100 - (monthsUntil / maxMonths * 100)) : 0;
        
        let tag = (i === fastestPlanIndex) ? ' <span class="chip green" style="margin-left:8px;font-size:10px;">Fastest</span>' : '';
        
        return `
            <div class="plan-row">
                <div class="plan-name">${p.name}${tag}</div>
                <div class="plan-track"><div class="plan-progress" style="width: ${pct}%"></div></div>
                <div class="plan-result">${dateStr} <br><small>${lateText}</small></div>
            </div>
        `;
    }).join('');

    // Reval
    document.getElementById('revalFee').innerText = a.revalTotalFee;
    const rBody = document.getElementById('revalBody');
    rBody.innerHTML = a.revaluation.map(r => {
        let cClass = r.verdict === 'WORTH_CONSIDERING' ? 'green' : r.verdict === 'UNLIKELY' ? 'red' : 'amber';
        let vText = r.verdict === 'NEED_MARKS' ? 'Add marks' : r.verdict.replace('_', ' ');
        // Sentence case for vText
        vText = vText.charAt(0).toUpperCase() + vText.slice(1).toLowerCase();
        return `<tr>
            <td>${r.code} - ${r.name}</td>
            <td>${r.marks || '-'}</td>
            <td>${r.passMark}</td>
            <td><span class="chip ${cClass}">${vText}</span></td>
        </tr>`;
    }).join('');
    
    // Populate Drawer
    
    // Rules Panel and Badges
    if (a.rules) {
        const isNep = state.student.admissionYear >= 2024;
        const badgeText = isNep 
            ? "NEP batch: rules not verified, estimate only" 
            : "Rules: AKTU ordinance 2018-19, clause-referenced";
        const badgeClass = isNep ? "badge amber" : "badge blue";
        
        const topBadge = document.querySelector('.nav-right .badge');
        if (topBadge) {
            topBadge.innerText = badgeText;
            topBadge.className = badgeClass;
        }
        
        const footerBadge = document.querySelector('footer small');
        if (footerBadge) {
            footerBadge.innerText = badgeText;
            footerBadge.style.color = isNep ? "var(--amber)" : "var(--blue, #3b82f6)";
        }
        
        const rulesList = document.getElementById('rulesList');
        const assumptionsList = document.getElementById('assumptionsList');
        
        let fromOrd = [];
        let notFound = [];
        let assumpt = [];
        
        if (a.rules.sources) {
            for (let k in a.rules.sources) {
                let v = a.rules.sources[k];
                if (v.toLowerCase().includes("not found")) {
                    notFound.push(`${k}: ${v}`);
                } else {
                    fromOrd.push(`<strong>${k}</strong>: ${v}`);
                }
            }
        }
        if (a.rules.assumptions) {
            a.rules.assumptions.forEach(v => {
                if (v.toLowerCase().includes("not found")) notFound.push(v);
                else assumpt.push(v);
            });
        }
        
        let htmlStr = '';
        if (fromOrd.length > 0) {
            htmlStr += `<div style="margin-top: 10px; font-weight: 600;">From ordinance text</div><ul>` + fromOrd.map(x => `<li>${x}</li>`).join('') + `</ul>`;
        }
        if (assumpt.length > 0) {
            htmlStr += `<div style="margin-top: 10px; font-weight: 600;">Assumptions</div><ul>` + assumpt.map(x => `<li>${x}</li>`).join('') + `</ul>`;
        }
        if (notFound.length > 0) {
            htmlStr += `<div style="margin-top: 10px; font-weight: 600;">Not found</div><ul>` + notFound.map(x => `<li>${x}</li>`).join('') + `</ul>`;
        }
        
        if (rulesList) rulesList.innerHTML = htmlStr;
        if (assumptionsList) assumptionsList.innerHTML = ''; // cleared as combined
    }

    populateDrawer(state.student);
}

function populateDrawer(student) {
    if (!student) return;
    document.getElementById('studentName').value = student.name;
    document.getElementById('admYear').value = student.admissionYear;
    document.getElementById('lastSem').value = student.lastCompletedSemester;
    const sCont = document.getElementById('subjectsContainer');
    sCont.innerHTML = '';
    student.subjects.forEach(sub => sCont.insertAdjacentHTML('beforeend', getSubRow(sub)));
}

let updateTimer;
function updateClears(val) {
    document.getElementById('clearsVal').innerText = val;
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => { analyze(val); }, 300);
}

function toggleDrawer() {
    document.getElementById('drawer').classList.toggle('open');
    document.getElementById('drawerOverlay').classList.toggle('open');
}

function getSubRow(s = {code:'', semester:1, credits:4, type:'THEORY', grade:'C', marks:null, name:''}) {
    return `<div class="sub-row">
        <input type="text" placeholder="e.g. BAS101" title="e.g. BAS101" value="${s.code}" class="s-code">
        <input type="number" placeholder="Sem" title="Semester 1-8" value="${s.semester}" class="s-sem">
        <input type="number" placeholder="Cr" title="Credits 1-6" value="${s.credits}" class="s-cr">
        <select class="s-grade" title="Grade"><option value="A+" ${s.grade=='A+'?'selected':''}>A+</option><option value="A" ${s.grade=='A'?'selected':''}>A</option><option value="B+" ${s.grade=='B+'?'selected':''}>B+</option><option value="B" ${s.grade=='B'?'selected':''}>B</option><option value="C" ${s.grade=='C'?'selected':''}>C</option><option value="D" ${s.grade=='D'?'selected':''}>D</option><option value="E" ${s.grade=='E'?'selected':''}>E</option><option value="F" ${s.grade=='F'?'selected':''}>F</option></select>
        <button class="btn icon" onclick="this.parentElement.remove()">&times;</button>
    </div>`;
}

function addSubjectRow() {
    document.getElementById('subjectsContainer').insertAdjacentHTML('beforeend', getSubRow());
}

function saveMyResults() {
    const s = {
        name: document.getElementById('studentName').value || 'My Results',
        admissionYear: parseInt(document.getElementById('admYear').value || 2024),
        lastCompletedSemester: parseInt(document.getElementById('lastSem').value || 1),
        subjects: []
    };
    // Match with existing student subjects to preserve hidden fields
    let oldSubjects = (state.student && state.student.subjects) ? state.student.subjects : 
                      ((state.demoStudent && state.demoStudent.subjects) ? state.demoStudent.subjects : []);
    
    document.querySelectorAll('.sub-row').forEach(row => {
        let c = row.querySelector('.s-code').value;
        let old = oldSubjects.find(x => x.code === c) || { name: "", type: "THEORY", marks: null };
        s.subjects.push({
            ...old,
            code: c,
            semester: parseInt(row.querySelector('.s-sem').value || 1),
            credits: parseInt(row.querySelector('.s-cr').value || 4),
            grade: row.querySelector('.s-grade').value
        });
    });
    state.student = s;
    localStorage.setItem('compass.student.v2', JSON.stringify(s));
    toggleDrawer();
    analyze();
}

function clearMyResults() {
    localStorage.removeItem('compass.student.v2');
    state.student = null;
    state.analysis = null;
    if (state.demoStudent) populateDrawer(state.demoStudent);
    toggleDrawer();
    document.getElementById('appContent').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
}
