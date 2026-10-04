package com.compass;

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
    
    private final Models.Rules rules;
    private final Models.Student demoStudent;
    private final Engine engine;

    public ApiController() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        try (InputStream is = new ClassPathResource("rules/aktu-sample.json").getInputStream()) {
            this.rules = mapper.readValue(is, Models.Rules.class);
        }
        try (InputStream is = new ClassPathResource("demo/demo-student.json").getInputStream()) {
            this.demoStudent = mapper.readValue(is, Models.Student.class);
        }
        this.engine = new Engine(this.rules);
    }

    @GetMapping("/demo")
    public Models.Student getDemoStudent() {
        return demoStudent;
    }

    @GetMapping("/rules")
    public Models.Rules getRules() {
        return rules;
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyze(@RequestBody Models.AnalyzeRequest request) {
        List<String> errors = new ArrayList<>();
        Models.Student s = request.student();
        if (s == null) return ResponseEntity.badRequest().body(List.of("Student data missing."));
        
        if (s.lastCompletedSemester() < 0 || s.lastCompletedSemester() > rules.semesterCount()) {
            errors.add("Invalid lastCompletedSemester (must be 0 to " + rules.semesterCount() + ").");
        }
        
        if (s.subjects() != null) {
            for (Models.Subject sub : s.subjects()) {
                if (!rules.grades().containsKey(sub.grade())) {
                    errors.add("Unknown grade '" + sub.grade() + "' in subject " + sub.code());
                }
                if (sub.credits() < 0 || sub.credits() > 6) {
                    errors.add("Invalid credits (" + sub.credits() + ") in subject " + sub.code() + ", must be 0..6");
                }
                if (sub.semester() < 1 || sub.semester() > rules.semesterCount()) {
                    errors.add("Invalid semester (" + sub.semester() + ") in subject " + sub.code() + ", must be 1.." + rules.semesterCount());
                }
            }
        }
        
        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(errors);
        }
        
        int clearsPerCycle = request.clearsPerCycle() != null ? request.clearsPerCycle() : 2;
        Models.AnalyzeResponse response = engine.analyze(s, clearsPerCycle);
        return ResponseEntity.ok(response);
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleException(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
    }
}
