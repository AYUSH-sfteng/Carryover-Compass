import re

with open('src/main/java/com/compass/Engine.java', 'r') as f:
    content = f.read()

# Replace all occurrences of old fields
content = content.replace('rules.maxCarryForPromotion()', '100') # default dummy
content = content.replace('rules.maxClearsPerCycle()', '100')
content = content.replace('rules.passMarksPractical()', '0')
content = content.replace('rules.nearMissMarks()', 'rules.revaluation().nearMissMarks()')
content = content.replace('rules.revalFeeINR()', 'rules.revaluation().feePerPaperINR()')

# Revaluation theory only
reval_loop = """        for (Models.Subject b : backlogs) {
            if (b.marks() != null) {"""

reval_loop_new = """        for (Models.Subject b : backlogs) {
            if (rules.revaluation() != null && rules.revaluation().theoryOnly() && !"THEORY".equalsIgnoreCase(b.type())) {
                continue;
            }
            if (b.marks() != null) {"""
content = content.replace(reval_loop, reval_loop_new)

# AnalyzeResponse
resp_old = """return new Models.AnalyzeResponse(
                Math.round(creditsEarned * 100.0) / 100.0,
                creditsRequired,
                Math.round(creditsRemaining * 100.0) / 100.0,
                Math.round(cgpa * 100.0) / 100.0,
                semesters, backlogs, promotion, new Models.RiskInfo(riskLevel, riskReasons),
                plans, revaluation, revalTotalFee, nextAction, rules.verified()
        );"""

resp_new = """return new Models.AnalyzeResponse(
                Math.round(creditsEarned * 100.0) / 100.0,
                creditsRequired,
                Math.round(creditsRemaining * 100.0) / 100.0,
                Math.round(cgpa * 100.0) / 100.0,
                semesters, backlogs, promotion, new Models.RiskInfo(riskLevel, riskReasons),
                plans, revaluation, revalTotalFee, nextAction, rules
        );"""

content = content.replace(resp_old, resp_new)

with open('src/main/java/com/compass/Engine.java', 'w') as f:
    f.write(content)
