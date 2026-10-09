with open('update_engine_logic.py', 'r') as f:
    content = f.read()

content = content.replace(
    'Models.Plan planB = simulatePlan("Plan B (Steady)", student, 100, false, backlogs, creditsEarned);',
    'Models.Plan planB = simulatePlan("Plan B (Steady)", student, clearsPerCycle, false, backlogs, creditsEarned);'
)

with open('update_engine_logic.py', 'w') as f:
    f.write(content)
