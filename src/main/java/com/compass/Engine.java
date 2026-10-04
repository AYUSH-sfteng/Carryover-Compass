package com.compass;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

public class Engine {
    private final Models.Rules rules;
    
    public Engine(Models.Rules rules) {
        this.rules = rules;
    }
    
    public Models.AnalyzeResponse analyze(Models.Student student, int clearsPerCycle) {
        double creditsEarned = 0;
        double creditsRequired = rules.totalCredits();
        double totalPoints = 0;
        double totalAttemptedCredits = 0;
        
        List<Models.Subject> backlogs = new ArrayList<>();
        Map<Integer, List<Models.Subject>> semSubjects = new HashMap<>();
        
        for (Models.Subject sub : student.subjects()) {
            semSubjects.computeIfAbsent(sub.semester(), k -> new ArrayList<>()).add(sub);
            int points = rules.grades().getOrDefault(sub.grade(), 0);
            totalAttemptedCredits += sub.credits();
            totalPoints += (points * sub.credits());
            
            if (points >= rules.passMinPoints()) {
                creditsEarned += sub.credits();
            } else if (sub.semester() <= student.lastCompletedSemester()) {
                backlogs.add(sub);
            }
        }
        
        double cgpa = totalAttemptedCredits > 0 ? (totalPoints / totalAttemptedCredits) : 0.0;
        double creditsRemaining = creditsRequired - creditsEarned;
        
        List<Models.SemesterResult> semesters = new ArrayList<>();
        for (int i = 1; i <= rules.semesterCount(); i++) {
            if (i > student.lastCompletedSemester()) {
                semesters.add(new Models.SemesterResult(i, "FUTURE", List.of(), 0.0));
            } else {
                List<Models.Subject> subs = semSubjects.getOrDefault(i, List.of());
                double semPts = 0;
                double semCreds = 0;
                List<String> carry = new ArrayList<>();
                for (Models.Subject sub : subs) {
                    int pts = rules.grades().getOrDefault(sub.grade(), 0);
                    semPts += (pts * sub.credits());
                    semCreds += sub.credits();
                    if (pts < rules.passMinPoints()) carry.add(sub.code());
                }
                double sgpa = semCreds > 0 ? semPts / semCreds : 0.0;
                String status = carry.isEmpty() ? "CLEARED" : "HAS_CARRY";
                semesters.add(new Models.SemesterResult(i, status, carry, sgpa));
            }
        }
        
        boolean canPromote = backlogs.size() <= rules.maxCarryForPromotion();
        String promMsg = canPromote ? "You are eligible for promotion." : "Not eligible for promotion due to excess carry papers.";
        Models.PromotionInfo promotion = new Models.PromotionInfo(canPromote, backlogs.size(), rules.maxCarryForPromotion(), promMsg);
        
        List<String> riskReasons = new ArrayList<>();
        String riskLevel = "LOW";
        if (backlogs.size() > rules.maxCarryForPromotion()) {
            riskLevel = "HIGH";
            riskReasons.add("Carry count exceeds promotion limit.");
        } else if (backlogs.size() > 0.7 * rules.maxCarryForPromotion()) {
            riskLevel = "MEDIUM";
            riskReasons.add("Approaching promotion carry limit.");
        }
        
        boolean multipleInSem = false;
        for (int i = 1; i <= student.lastCompletedSemester(); i++) {
            int c = 0;
            for (Models.Subject b : backlogs) {
                if (b.semester() == i) c++;
            }
            if (c >= 2) multipleInSem = true;
        }
        if (multipleInSem && !"HIGH".equals(riskLevel)) {
            riskLevel = "MEDIUM";
            riskReasons.add("Multiple carry papers in a single semester.");
        }
        
        Models.Plan planA = simulatePlan("Plan A (Clear fast)", student, rules.maxClearsPerCycle(), false, backlogs.size());
        Models.Plan planB = simulatePlan("Plan B (Steady)", student, clearsPerCycle, false, backlogs.size());
        Models.Plan planC = simulatePlan("Plan C (Miss next cycle)", student, clearsPerCycle, true, backlogs.size());
        List<Models.Plan> plans = List.of(planA, planB, planC);
        
        for (Models.Plan p : plans) {
            if (p.monthsLate() > (rules.maxDurationYears() - 4) * 12) {
                riskLevel = "HIGH";
                riskReasons.add("Graduation may exceed max duration limit.");
                break;
            }
        }
        
        List<Models.RevalAdvice> revaluation = new ArrayList<>();
        int revalTotalFee = 0;
        for (Models.Subject b : backlogs) {
            if (b.marks() != null) {
                int passMark = "THEORY".equalsIgnoreCase(b.type()) ? rules.passMarksTheory() : rules.passMarksPractical();
                int gap = passMark - b.marks();
                String verdict = "UNLIKELY";
                if (gap <= rules.nearMissMarks() && gap > 0) {
                    verdict = "WORTH_CONSIDERING";
                    revalTotalFee += rules.revalFeeINR();
                } else if (gap <= 0) {
                    verdict = "UNLIKELY"; // Anomalous or already passed based on marks but graded F?
                }
                revaluation.add(new Models.RevalAdvice(b.code(), b.name(), b.marks(), passMark, gap, verdict, rules.revalFeeINR()));
            } else {
                revaluation.add(new Models.RevalAdvice(b.code(), b.name(), 0, 0, 0, "NEED_MARKS", 0));
            }
        }
        
        String nextAction = "Focus on upcoming regular semesters.";
        if (!backlogs.isEmpty()) {
            Models.Subject highestCreditBacklog = backlogs.stream().max(Comparator.comparingInt(Models.Subject::credits)).orElse(backlogs.get(0));
            nextAction = "Prioritize clearing " + highestCreditBacklog.code() + " (" + highestCreditBacklog.credits() + " credits) in the next available cycle.";
        }
        
        return new Models.AnalyzeResponse(
                Math.round(creditsEarned * 100.0) / 100.0,
                creditsRequired,
                Math.round(creditsRemaining * 100.0) / 100.0,
                Math.round(cgpa * 100.0) / 100.0,
                semesters, backlogs, promotion, new Models.RiskInfo(riskLevel, riskReasons),
                plans, revaluation, revalTotalFee, nextAction, rules.verified()
        );
    }
    
    private Models.Plan simulatePlan(String name, Models.Student student, int clears, boolean skipFirst, int initialBacklogs) {
        LocalDate currentDate = LocalDate.now().withDayOfMonth(15);
        int currentYear = currentDate.getYear();
        int currentMonth = currentDate.getMonthValue();
        
        int completedSem = student.lastCompletedSemester();
        int backlogsLeft = initialBacklogs;
        
        LocalDate graduationDate = null;
        List<Models.TimelineEvent> timeline = new ArrayList<>();
        
        LocalDate simDate = currentDate;
        boolean firstCycleSkipped = false;
        
        LocalDate onTimeGraduation = LocalDate.of(student.admissionYear() + 4, 6, 15).plusDays(rules.resultDelayDays());
        
        for (int i = 0; i < 50; i++) { // limit iterations
            // Find next cycle
            LocalDate nextCycleDate = null;
            Models.CycleRule nextCycle = null;
            
            for (int y = simDate.getYear(); y <= simDate.getYear() + 1 && nextCycleDate == null; y++) {
                for (Models.CycleRule cr : rules.cycles()) {
                    LocalDate candidate = LocalDate.of(y, cr.month(), 15);
                    if (candidate.isAfter(simDate) || candidate.isEqual(simDate)) {
                        if (nextCycleDate == null || candidate.isBefore(nextCycleDate)) {
                            nextCycleDate = candidate;
                            nextCycle = cr;
                        }
                    }
                }
            }
            
            if (nextCycleDate == null) break;
            simDate = nextCycleDate;
            
            if (skipFirst && !firstCycleSkipped) {
                firstCycleSkipped = true;
                timeline.add(new Models.TimelineEvent(simDate, "Skipped", "Skipped cycle " + nextCycle.type()));
                continue;
            }
            
            if (("EVEN".equals(nextCycle.type()) || "ODD".equals(nextCycle.type())) && completedSem < rules.semesterCount() && backlogsLeft <= rules.maxCarryForPromotion()) {
                completedSem++;
                timeline.add(new Models.TimelineEvent(simDate, "Semester " + completedSem, "Completed semester " + completedSem));
            }
            
            if (backlogsLeft > 0) {
                int cleared = Math.min(clears, backlogsLeft);
                cleared = Math.min(cleared, rules.maxClearsPerCycle());
                if (cleared > 0) {
                    backlogsLeft -= cleared;
                    timeline.add(new Models.TimelineEvent(simDate, "Carry", "Cleared " + cleared + " carry paper(s)"));
                }
            }
            
            if (completedSem == rules.semesterCount() && backlogsLeft == 0) {
                graduationDate = simDate.plusDays(rules.resultDelayDays());
                break;
            }
            
            if (simDate.getYear() > student.admissionYear() + rules.maxDurationYears()) {
                break;
            }
        }
        
        int monthsLate = 0;
        if (graduationDate != null) {
            int m1 = onTimeGraduation.getYear() * 12 + onTimeGraduation.getMonthValue();
            int m2 = graduationDate.getYear() * 12 + graduationDate.getMonthValue();
            monthsLate = Math.max(0, m2 - m1);
        }
        
        return new Models.Plan(name, graduationDate, monthsLate, timeline);
    }
}
