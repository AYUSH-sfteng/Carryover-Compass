import re

# 1. Update index.html
with open('src/main/resources/static/index.html', 'r') as f:
    html = f.read()

header_html = """            <h3>Subjects</h3>
            <div class="sub-header-row">
                <span>Code</span>
                <span>Sem</span>
                <span>Credits</span>
                <span>Grade</span>
                <span></span>
            </div>"""

html = html.replace('<h3>Subjects</h3>', header_html)

with open('src/main/resources/static/index.html', 'w') as f:
    f.write(html)

# 2. Update app.js
with open('src/main/resources/static/app.js', 'r') as f:
    js = f.read()

# I need to find the getSubRow function and update the inputs
# Current getSubRow string: `<div class="sub-row">
#        <input type="text" placeholder="Code" value="${s.code}" class="s-code">
#        <input type="number" placeholder="Sem" value="${s.semester}" class="s-sem">
#        <input type="number" placeholder="Cr" value="${s.credits}" class="s-cr">
#        <select class="s-grade">...`

js = js.replace('<input type="text" placeholder="Code" value="${s.code}" class="s-code">', 
                '<input type="text" placeholder="e.g. BAS101" title="e.g. BAS101" value="${s.code}" class="s-code">')
js = js.replace('<input type="number" placeholder="Sem" value="${s.semester}" class="s-sem">',
                '<input type="number" placeholder="Sem" title="Semester 1-8" value="${s.semester}" class="s-sem">')
js = js.replace('<input type="number" placeholder="Cr" value="${s.credits}" class="s-cr">',
                '<input type="number" placeholder="Cr" title="Credits 1-6" value="${s.credits}" class="s-cr">')
js = js.replace('<select class="s-grade">', '<select class="s-grade" title="Grade">')

with open('src/main/resources/static/app.js', 'w') as f:
    f.write(js)

# 3. Update style.css
with open('src/main/resources/static/style.css', 'r') as f:
    css = f.read()

header_css = """
.sub-header-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr auto;
    gap: 0.5rem;
    position: sticky;
    top: 0;
    background: var(--surface);
    z-index: 10;
    padding: 0.5rem 0;
    font-size: 0.8rem;
    color: var(--soft);
}
"""

# Insert after .sub-row
css = css.replace('.sub-row { display: grid;', header_css + '\n.sub-row { display: grid;')

with open('src/main/resources/static/style.css', 'w') as f:
    f.write(css)

