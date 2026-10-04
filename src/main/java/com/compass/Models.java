package com.compass;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class Models {
    public record Rules(
            String code, boolean verified, int semesterCount, int totalCredits,
            List<Integer> semesterCredits, Map<String, Integer> grades,
            int passMinPoints, int maxCarryForPromotion, int maxDurationYears,
            int maxClearsPerCycle, int passMarksTheory, int passMarksPractical,
            int nearMissMarks, int revalFeeINR, List<CycleRule> cycles,
            int resultDelayDays
    ) {}

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
            String nextAction, boolean rulesVerified
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
