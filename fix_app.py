import re

with open('src/main/resources/static/app.js', 'r') as f:
    code = f.read()

# Fix Risk badge capitalization
code = code.replace(
    "rBadge.innerText = a.risk.level + ' RISK';",
    "rBadge.innerText = a.risk.level.charAt(0).toUpperCase() + a.risk.level.slice(1).toLowerCase() + ' risk';"
)

# Fix Promotion message
promo_replacement = """
    let pMsg = a.promotion.message;
    if (state.student.lastCompletedSemester === state.rules.semesterCount) {
        pMsg = 'Saare semester complete. Degree ke liye backlogs clear karne hain.';
    }
    document.getElementById('promoStatus').innerText = pMsg;
"""
code = code.replace(
    "document.getElementById('promoStatus').innerText = a.promotion.message;",
    promo_replacement.strip()
)

# Fix Plans formatting
plans_replacement = """
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
        
        return \
            <div class="plan-row">
                <div class="plan-name">\\</div>
                <div class="plan-track"><div class="plan-progress" style="width: \%"></div></div>
                <div class="plan-result">\ <br><small>\</small></div>
            </div>
        \;
    }).join('');
"""

code = re.sub(
    r"const pCont = document\.getElementById\('plansContainer'\);[\s\S]*?\}\)\.join\(''\);",
    plans_replacement.strip(),
    code
)

# Revaluation verdict
reval_replacement = """
    const rBody = document.getElementById('revalBody');
    rBody.innerHTML = a.revaluation.map(r => {
        let cClass = r.verdict === 'WORTH_CONSIDERING' ? 'green' : r.verdict === 'UNLIKELY' ? 'red' : 'amber';
        let vText = r.verdict === 'NEED_MARKS' ? 'Add marks' : r.verdict.replace('_', ' ');
        // Sentence case for vText
        vText = vText.charAt(0).toUpperCase() + vText.slice(1).toLowerCase();
        return \<tr>
            <td>\ - \</td>
            <td>\</td>
            <td>\</td>
            <td><span class="chip \">\</span></td>
        </tr>\;
    }).join('');
"""
code = re.sub(
    r"const rBody = document\.getElementById\('revalBody'\);[\s\S]*?\}\)\.join\(''\);",
    reval_replacement.strip(),
    code
)

with open('src/main/resources/static/app.js', 'w', encoding='utf-8') as f:
    f.write(code)
