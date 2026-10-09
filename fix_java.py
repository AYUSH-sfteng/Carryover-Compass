import os

# Update ApiController.java
with open('src/main/java/com/compass/ApiController.java', 'r') as f:
    content = f.read()

content = content.replace('"rules/aktu-sample.json"', '"rules/aktu-btech-2018.json"')

with open('src/main/java/com/compass/ApiController.java', 'w') as f:
    f.write(content)

# Update Models.java
models_code = """package com.compass;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

public class Models {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Rules(
            String code, String ordinance, boolean verified, int semesterCount, int totalCredits,
            List<Double> semesterCredits, Map<String, Integer> grades,
            int passMinPoints, int maxDurationYears,
            int passMarksTheory,
            PromotionRule promotion, RevaluationRule revaluation,
            List<CycleRule> cycles, int resultDelayDays,
            Map<String, String> sources, List<String> assumptions
    ) {}

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

