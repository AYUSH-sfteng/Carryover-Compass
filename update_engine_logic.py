import os

with open('src/main/java/com/compass/Engine.java', 'r') as f:
    original = f.read()

# I will replace the analyze and simulatePlan methods
engine_java = """package com.compass;

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
        
        // PROMOTION LOGIC
        boolean canPromote = true;
        String promMsg = "You are eligible for promotion.";
        
        for (int k = 1; k <= student.lastCompletedSemester() / 2; k++) {
            int semOdd = 2 * k - 1;
            int semEven = 2 * k;
            
            List<Models.Subject> s1 = semSubjects.getOrDefault(semOdd, List.of());
            List<Models.Subject> s2 = semSubjects.getOrDefault(semEven, List.of());
            
            boolean s1AllCleared = !s1.isEmpty();
            for (Models.Subject s : s1) {
                if (rules.grades().getOrDefault(s.grade(), 0) < rules.passMinPoints()) s1AllCleared = false;
            }
            
            boolean s2AllCleared = !s2.isEmpty();
            for (Models.Subject s : s2) {
                if (rules.grades().getOrDefault(s.grade(), 0) < rules.passMinPoints()) s2AllCleared = false;
            }
            
            double creditsEarnedInYear = 0;
            for (Models.Subject s : s1) {
                if (rules.grades().getOrDefault(s.grade(), 0) >= rules.passMinPoints()) creditsEarnedInYear += s.credits();
            }
            for (Models.Subject s : s2) {
                if (rules.grades().getOrDefault(s.grade(), 0) >= rules.passMinPoints()) creditsEarnedInYear += s.credits();
            }
            
            double req1 = rules.semesterCredits() != null && rules.semesterCredits().size() >= semOdd ? rules.semesterCredits().get(semOdd - 1) : 0;
            double req2 = rules.semesterCredits() != null && rules.semesterCredits().size() >= semEven ? rules.semesterCredits().get(semEven - 1) : 0;
            double minRequired = Math.min(req1, req2);
            
            if (!s1.isEmpty() && !s2.isEmpty() && !(s1AllCleared || s2AllCleared || creditsEarnedInYear >= minRequired)) {
                canPromote = false;
                promMsg = "YEAR_BACK in Year " + k + " (Credit shortfall).";
                break;
            }
        }
        
        if (student.lastCompletedSemester() == rules.semesterCount()) {
            canPromote = true;
            promMsg = "Saare semester complete. Degree ke liye backlogs clear karne hain.";
        }
        
        Models.PromotionInfo promotion = new Models.PromotionInfo(canPromote, backlogs.size(), 0, promMsg);
        
        List<String> riskReasons = new ArrayList<>();
        String riskLevel = "LOW";
        if (!canPromote && student.lastCompletedSemester() < rules.semesterCount()) {
            riskLevel = "HIGH";
            riskReasons.add("Credit shortfall for promotion to next year.");
        }
        
        Models.Plan planA = simulatePlan("Plan A (Clear fast)", student, 100, false, backlogs, creditsEarned);
        Models.Plan planB = simulatePlan("Plan B (Steady)", student, clearsPerCycle, false, backlogs, creditsEarned);
        Models.Plan planC = simulatePlan("Plan C (Miss next cycle)", student, clearsPerCycle, true, backlogs, creditsEarned);
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
            if (rules.revaluation() != null && rules.revaluation().theoryOnly() && !"THEORY".equalsIgnoreCase(b.type())) {
                continue;
            }
            if (b.marks() != null) {
                int passMark = "THEORY".equalsIgnoreCase(b.type()) ? rules.passMarksTheory() : 0;
                int gap = passMark - b.marks();
                String verdict = "UNLIKELY";
                if (rules.revaluation() != null && gap <= rules.revaluation().nearMissMarks() && gap > 0) {
                    verdict = "WORTH_CONSIDERING";
                    revalTotalFee += rules.revaluation().feePerPaperINR();
                } else if (gap <= 0) {
                    verdict = "UNLIKELY";
                }
                int fee = rules.revaluation() != null ? rules.revaluation().feePerPaperINR() : 0;
                revaluation.add(new Models.RevalAdvice(b.code(), b.name(), b.marks(), passMark, gap, verdict, fee));
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
                plans, revaluation, revalTotalFee, nextAction, rules
        );
    }
    
    private Models.Plan simulatePlan(String name, Models.Student student, int clears, boolean skipFirst, List<Models.Subject> initialBacklogs, double initialCreditsEarned) {
        LocalDate currentDate = LocalDate.now().withDayOfMonth(15);
        int completedSem = student.lastCompletedSemester();
        
        List<Models.Subject> currentBacklogs = new ArrayList<>(initialBacklogs);
        double currentCreditsEarned = initialCreditsEarned;
        
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
                    if (candidate.isAfter(simDate)) {
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
            
            if (completedSem < rules.semesterCount()) {
                completedSem++;
                timeline.add(new Models.TimelineEvent(simDate, "Semester " + completedSem, "Completed semester " + completedSem));
            }
            
            if (!currentBacklogs.isEmpty()) {
                int clearedThisCycle = 0;
                Iterator<Models.Subject> it = currentBacklogs.iterator();
                while (it.hasNext() && clearedThisCycle < clears) {
                    Models.Subject b = it.next();
                    if (("ODD".equals(nextCycle.type()) && b.semester() % 2 != 0) ||
                        ("EVEN".equals(nextCycle.type()) && b.semester() % 2 == 0)) {
                        it.remove();
                        currentCreditsEarned += b.credits();
                        clearedThisCycle++;
                    }
                }
                if (clearedThisCycle > 0) {
                    timeline.add(new Models.TimelineEvent(simDate, "Carry", "Cleared " + clearedThisCycle + " carry paper(s) in " + nextCycle.type() + " cycle"));
                }
            }
            
            if (completedSem == rules.semesterCount() && currentBacklogs.isEmpty() && currentCreditsEarned >= rules.totalCredits()) {
                graduationDate = simDate.plusDays(rules.resultDelayDays());
                break;
            }
            
            if (simDate.getYear() > student.admissionYear() + rules.maxDurationYears()) {
                timeline.add(new Models.TimelineEvent(simDate, "Warning", "Max duration exceeded"));
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
"""

with open('src/main/java/com/compass/Engine.java', 'w') as f:
    f.write(engine_java)
