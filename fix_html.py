import re
with open('src/main/resources/static/index.html', 'r') as f:
    html = f.read()
html = html.replace('<h4 style="margin-top: 10px;">Assumptions</h4>', '')
with open('src/main/resources/static/index.html', 'w') as f:
    f.write(html)
