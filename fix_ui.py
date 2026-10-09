import re

# Update index.html
with open('src/main/resources/static/index.html', 'r') as f:
    html = f.read()

rules_panel = """
            <div class="panel wide tilt" id="rulesPanel">
                <h3>Rules Used</h3>
                <div id="rulesList" style="font-size: 0.9em; color: var(--soft); margin-top: 5px;"></div>
                <h4 style="margin-top: 10px;">Assumptions</h4>
                <ul id="assumptionsList" style="font-size: 0.9em; color: var(--soft);"></ul>
            </div>
"""

# Insert rules_panel after "Next Step" panel
if "rulesPanel" not in html:
    html = html.replace('</p>\n            </div>\n        </section>', '</p>\n            </div>' + rules_panel + '\n        </section>')

with open('src/main/resources/static/index.html', 'w') as f:
    f.write(html)

# Update app.js
with open('src/main/resources/static/app.js', 'r') as f:
    js = f.read()

# Update getSubRow to fix grades
old_grades = """<select class="s-grade"><option value="O" ${s.grade=='O'?'selected':''}>O</option><option value="A+" ${s.grade=='A+'?'selected':''}>A+</option><option value="A" ${s.grade=='A'?'selected':''}>A</option><option value="B+" ${s.grade=='B+'?'selected':''}>B+</option><option value="B" ${s.grade=='B'?'selected':''}>B</option><option value="C" ${s.grade=='C'?'selected':''}>C</option><option value="F" ${s.grade=='F'?'selected':''}>F</option></select>"""
new_grades = """<select class="s-grade"><option value="A+" ${s.grade=='A+'?'selected':''}>A+</option><option value="A" ${s.grade=='A'?'selected':''}>A</option><option value="B+" ${s.grade=='B+'?'selected':''}>B+</option><option value="B" ${s.grade=='B'?'selected':''}>B</option><option value="C" ${s.grade=='C'?'selected':''}>C</option><option value="D" ${s.grade=='D'?'selected':''}>D</option><option value="E" ${s.grade=='E'?'selected':''}>E</option><option value="F" ${s.grade=='F'?'selected':''}>F</option></select>"""
js = js.replace(old_grades, new_grades)

# Update render logic to modify badges and populate rules panel
badge_logic = """
    // Rules Panel and Badges
    if (a.rules) {
        const verified = a.rules.verified;
        const badgeText = verified 
            ? "Rules: AKTU ordinance, clause-referenced" 
            : "Rules: AKTU ordinance 2018-19 (confirm for your batch)";
        const badgeClass = verified ? "badge green" : "badge warning";
        
        const topBadge = document.querySelector('.nav-right .badge');
        if (topBadge) {
            topBadge.innerText = badgeText;
            topBadge.className = badgeClass;
        }
        
        const footerBadge = document.querySelector('footer small');
        if (footerBadge) {
            footerBadge.innerText = badgeText;
            if (verified) footerBadge.style.color = "var(--green)";
        }
        
        const rulesList = document.getElementById('rulesList');
        if (rulesList && a.rules.sources) {
            let htmlStr = '';
            for (let k in a.rules.sources) {
                htmlStr += `<div><strong>${k}</strong>: ${a.rules.sources[k]}</div>`;
            }
            rulesList.innerHTML = htmlStr;
        }
        const assumptionsList = document.getElementById('assumptionsList');
        if (assumptionsList && a.rules.assumptions) {
            assumptionsList.innerHTML = a.rules.assumptions.map(x => `<li>${x}</li>`).join('');
        }
    }
"""

if "Rules Panel and Badges" not in js:
    js = js.replace("populateDrawer(state.student);", badge_logic + "\n    populateDrawer(state.student);")

with open('src/main/resources/static/app.js', 'w') as f:
    f.write(js)
