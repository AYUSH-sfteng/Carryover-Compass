import json
import urllib.request
import time

student = json.load(open('src/main/resources/demo/demo-student.json'))

req_data = json.dumps({'student': student, 'clearsPerCycle': 2}).encode('utf-8')
req = urllib.request.Request('http://localhost:8080/api/analyze', data=req_data, headers={'Content-Type': 'application/json'})

for i in range(15):
    try:
        response = urllib.request.urlopen(req)
        break
    except Exception as e:
        time.sleep(1)

data = json.loads(response.read().decode('utf-8'))
plans = data['plans']
for p in plans:
    print(f"{p['name'].split(' ')[0]} {p['name'].split(' ')[1]}: {p['graduation']}")
