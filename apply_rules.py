import json
import os
import re

# 1. Create rule files
aktu_2018 = {
    "code": "AKTU_BTECH_2018",
    "ordinance": "AKTU B.Tech AICTE Model Curriculum Ordinance, effective 2018-19",
    "appliesToAdmissionYears": {"from": 2018, "to": 2023},
    "verifiedLevel": "ordinance-text",
    "semesterCount": 8,
    "totalCredits": 160,
    "semesterCredits": [17.5, 20.5, 21, 21, 21, 21, 20, 18],
    "grades": {"A+": 10, "A": 9, "B+": 8, "B": 7, "C": 6, "D": 5, "E": 4, "F": 0},
    "passMinPoints": 4,
    "passRules": {"theoryEndSemMinPct": 30, "theoryAggregateMinPct": 40, "practicalMinPct": 50},
    "maxDurationYears": 7,
    "maxDurationLateralYears": 6,
    "promotion": {"type": "YEAR_CREDITS"},
    "yearPass": {"minSgpa": 5.0},
    "carry": {"onlyWithEndSemExam": True},
    "revaluation": {"theoryOnly": True, "feePerPaperINR": 500, "nearMissMarks": 5},
    "cgpaToPercentage": {"subtract": 0.75, "multiply": 10},
    "cycles": [{"type": "EVEN", "month": 6}, {"type": "ODD", "month": 12}],
    "resultDelayDays": 50,
    "sources": {
        "totalCredits": "cl. 4.4, 9.9",
        "maxDurationYears": "cl. 4.2",
        "grades": "cl. 14.1",
        "passRules": "cl. 9.1",
        "promotion": "cl. 10.1, 10.2",
        "yearPass": "cl. 10.3",
        "carry": "cl. 11.1, 11.2",
        "revaluation": "cl. 17.1",
        "cgpaToPercentage": "cl. 15"
    },
    "assumptions": [
        "semesterCredits: ordinance illustration, not the CSE scheme (CSE Sem V=22, VI=21)",
        "feePerPaperINR: circular not found",
        "revaluation time limit and grace marks: not found",
        "cycles months and resultDelayDays",
        "nearMissMarks: app heuristic",
        "carry papers cleared only in same-parity cycle: interpretation of cl. 11.1(a)"
    ]
}

aktu_2024 = dict(aktu_2018)
aktu_2024["code"] = "AKTU_BTECH_NEP_2024"
aktu_2024["appliesToAdmissionYears"] = {"from": 2024}
aktu_2024["verifiedLevel"] = "none"
aktu_2024["note"] = "Official NEP ordinance not found. Estimate using 2018 rules."

os.makedirs('src/main/resources/rules', exist_ok=True)
with open('src/main/resources/rules/aktu-btech-2018.json', 'w') as f:
    json.dump(aktu_2018, f, indent=2)

with open('src/main/resources/rules/aktu-btech-nep-2024.json', 'w') as f:
    json.dump(aktu_2024, f, indent=2)

# 2. Update Models.java
models_code = """package com.compass;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

public class Models {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Rules(
            String code, String ordinance, AppliesTo appliesToAdmissionYears, String verifiedLevel, String note,
            int semesterCount, int totalCredits,
            List<Double> semesterCredits, Map<String, Integer> grades,
            int passMinPoints, int maxDurationYears, int maxDurationLateralYears,
            int passMarksTheory, PassRules passRules, YearPass yearPass, Carry carry, CgpaToPercentage cgpaToPercentage,
            PromotionRule promotion, RevaluationRule revaluation,
            List<CycleRule> cycles, int resultDelayDays,
            Map<String, String> sources, List<String> assumptions
    ) {}

    public record AppliesTo(Integer from, Integer to) {}
    public record PassRules(int theoryEndSemMinPct, int theoryAggregateMinPct, int practicalMinPct) {}
    public record YearPass(double minSgpa) {}
    public record Carry(boolean onlyWithEndSemExam) {}
    public record CgpaToPercentage(double subtract, int multiply) {}

    public record PromotionRule(String type) {}
    public record RevaluationRule(boolean theoryOnly, int feePerPaperINR, int nearMissMarks) {}

    public record CycleRule(String type, int month) {}

    public record Student(
            String name, int admissionYear, int lastCompletedSemester,
            List<Subject> subjects
    ) {}

    public record Subject(
            String code, String name, int semester, int credits,
            String type, String grade, Integer marks
    ) {}

    public record AnalyzeRequest(Student student, Integer clearsPerCycle) {}

    public record AnalyzeResponse(
            double creditsEarned, double creditsRequired, double creditsRemaining, double cgpa,
            List<SemesterResult> semesters, List<Subject> backlogs,
            PromotionInfo promotion, RiskInfo risk, List<Plan> plans,
            List<RevalAdvice> revaluation, int revalTotalFee,
            String nextAction, Rules rules
    ) {}

    public record SemesterResult(
            int n, String status, List<String> carryCodes, double sgpa
    ) {}

    public record PromotionInfo(
            boolean canPromote, int carryCount, int limit, String message
    ) {}

    public record RiskInfo(
            String level, List<String> reasons
    ) {}

    public record Plan(
            String name, LocalDate graduation, int monthsLate, List<TimelineEvent> timeline
    ) {}

    public record TimelineEvent(
            LocalDate date, String label, String event
    ) {}

    public record RevalAdvice(
            String code, String name, int marks, int passMark,
            int gap, String verdict, int fee
    ) {}
}
"""
with open('src/main/java/com/compass/Models.java', 'w') as f:
    f.write(models_code)

# 3. Update ApiController.java
api_controller = """package com.compass;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ApiController {
    
    private final Models.Rules rules2018;
    private final Models.Rules rules2024;
    private final Models.Student demoStudent;

    public ApiController() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        try (InputStream is = new ClassPathResource("rules/aktu-btech-2018.json").getInputStream()) {
            this.rules2018 = mapper.readValue(is, Models.Rules.class);
        }
        try (InputStream is = new ClassPathResource("rules/aktu-btech-nep-2024.json").getInputStream()) {
            this.rules2024 = mapper.readValue(is, Models.Rules.class);
        }
        try (InputStream is = new ClassPathResource("demo/demo-student.json").getInputStream()) {
            this.demoStudent = mapper.readValue(is, Models.Student.class);
        }
    }

    @GetMapping("/demo")
    public Models.Student getDemoStudent() {
        return demoStudent;
    }

    @GetMapping("/rules")
    public Models.Rules getRules() {
        return rules2018; // Default fallback for generic rule fetch
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyze(@RequestBody Models.AnalyzeRequest request) {
        List<String> errors = new ArrayList<>();
        Models.Student s = request.student();
        if (s == null) return ResponseEntity.badRequest().body(List.of("Student data missing."));
        
        Models.Rules rules = (s.admissionYear() >= 2024) ? rules2024 : rules2018;
        
        if (s.lastCompletedSemester() < 0 || s.lastCompletedSemester() > rules.semesterCount()) {
            errors.add("Invalid lastCompletedSemester (must be 0 to " + rules.semesterCount() + ").");
        }
        
        if (s.subjects() != null) {
            for (Models.Subject sub : s.subjects()) {
                if (!rules.grades().containsKey(sub.grade())) {
                    errors.add("Unknown grade '" + sub.grade() + "' in subject " + sub.code());
                }
            }
        }
        
        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(errors);
        }
        
        int clearsPerCycle = request.clearsPerCycle() != null ? request.clearsPerCycle() : 2;
        Engine engine = new Engine(rules);
        Models.AnalyzeResponse response = engine.analyze(s, clearsPerCycle);
        return ResponseEntity.ok(response);
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleException(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
    }
}
"""
with open('src/main/java/com/compass/ApiController.java', 'w') as f:
    f.write(api_controller)

# 4. Update app.js
with open('src/main/resources/static/app.js', 'r') as f:
    js = f.read()

badge_logic_old = """    // Rules Panel and Badges
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
    }"""

badge_logic_new = """    // Rules Panel and Badges
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
    }"""

js = js.replace(badge_logic_old, badge_logic_new)
with open('src/main/resources/static/app.js', 'w') as f:
    f.write(js)

# 5. Add style for badge blue
with open('src/main/resources/static/style.css', 'r') as f:
    css = f.read()

if ".badge.blue" not in css:
    css += "\n.badge.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }\n"
if ".badge.amber" not in css:
    css += "\n.badge.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }\n"

with open('src/main/resources/static/style.css', 'w') as f:
    f.write(css)

# Update demo student to admission year 2022
demo_file = 'src/main/resources/demo/demo-student.json'
with open(demo_file, 'r') as f:
    demo = json.load(f)
demo['admissionYear'] = 2022
with open(demo_file, 'w') as f:
    json.dump(demo, f, indent=2)
