import urllib.request
import json
with open('src/main/resources/demo/demo-student.json') as f:
    student = json.load(f)

req = urllib.request.Request('http://localhost:8080/api/analyze', method='POST')
req.add_header('Content-Type', 'application/json')
data = json.dumps({'student': student, 'clearsPerCycle': 2}).encode('utf-8')
resp = urllib.request.urlopen(req, data=data)
result = json.loads(resp.read())
for plan in result['plans']:
    print(f'{plan["name"]}: {plan["graduation"]} (Late: {plan["monthsLate"]})')
