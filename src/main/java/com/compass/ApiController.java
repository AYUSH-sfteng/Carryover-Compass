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
