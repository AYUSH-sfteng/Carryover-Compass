import json
import re

# 1. Update demo-student.json
with open('src/main/resources/demo/demo-student.json', 'r') as f:
    student = json.load(f)

# The user wants CGPA 6.0 - 7.0
# Ensure credits and grades match
# Change O and P to other grades.
valid_grades = ['A+', 'A', 'B+', 'B', 'C', 'D', 'E', 'F']
grade_points = {'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C': 6, 'D': 5, 'E': 4, 'F': 0}

total_credits = 0
total_pts = 0

for s in student['subjects']:
    if s['grade'] not in valid_grades:
        if s['grade'] == 'O': s['grade'] = 'A+'
        elif s['grade'] == 'P': s['grade'] = 'D'
        else: s['grade'] = 'C' # fallback
    
    pts = grade_points[s['grade']]
    total_credits += s['credits']
    total_pts += pts * s['credits']

cgpa = total_pts / total_credits if total_credits > 0 else 0
print(f"Old CGPA: {cgpa}")

# Adjust to be between 6.0 and 7.0
if cgpa > 7.0:
    for s in student['subjects']:
        if s['grade'] in ['A+', 'A', 'B+']:
            s['grade'] = 'B'
            pts = grade_points[s['grade']]
elif cgpa < 6.0:
    for s in student['subjects']:
        if s['grade'] in ['E', 'D', 'C']:
            s['grade'] = 'B'
            pts = grade_points[s['grade']]

total_credits = 0
total_pts = 0
for s in student['subjects']:
    pts = grade_points[s['grade']]
    total_credits += s['credits']
    total_pts += pts * s['credits']

cgpa = total_pts / total_credits if total_credits > 0 else 0
print(f"New CGPA: {cgpa}")

with open('src/main/resources/demo/demo-student.json', 'w') as f:
    json.dump(student, f, indent=2)


# 2. Add aktu-btech-2018.json
aktu_json = {
    "code": "AKTU_BTECH_2018",
    "ordinance": "AKTU B.Tech Ordinance, AICTE Model Curriculum, effective 2018-19",
    "verified": False,
    "semesterCount": 8,
    "totalCredits": 160,
    "semesterCredits": [17.5, 20.5, 21, 21, 21, 21, 20, 18],
    "grades": {"A+": 10, "A": 9, "B+": 8, "B": 7, "C": 6, "D": 5, "E": 4, "F": 0},
    "passMinPoints": 4,
    "maxDurationYears": 7,
    "passMarksTheory": 40,
    "promotion": {"type": "YEAR_CREDITS"},
    "revaluation": {"theoryOnly": True, "feePerPaperINR": 500, "nearMissMarks": 5},
    "cycles": [{"type": "EVEN", "month": 6}, {"type": "ODD", "month": 12}],
    "resultDelayDays": 50,
    "sources": {
        "totalCredits": "Ordinance cl. 4.4, 9.9",
        "maxDurationYears": "cl. 4.2",
        "grades": "cl. 14.1, 9.1",
        "promotion": "cl. 10.1, 10.2",
        "carry": "cl. 11.1, 11.2",
        "revaluation": "cl. 17.1 (theory only)"
    },
    "assumptions": [
        "feePerPaperINR (circular, verify)",
        "resultDelayDays",
        "cycles months",
        "nearMissMarks (app heuristic)",
        "semesterCredits (ordinance example, verify branch scheme)"
    ]
}

with open('src/main/resources/rules/aktu-btech-2018.json', 'w') as f:
    json.dump(aktu_json, f, indent=2)
