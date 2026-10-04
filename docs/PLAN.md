# CarryOver Compass - Implementation Plan & Checklist

## High-Level Architecture & Phases

### Phase 1: Project Setup & Rules Engine Foundation (P0)
- Setup Spring Boot 3.x Maven project with Java 17.
- Dependencies: `spring-boot-starter-web`, `spring-boot-starter-validation`, `spring-boot-starter-data-jpa`, `h2`, `openpdf`, `spring-boot-starter-test`.
- Create domain models (`Student`, `Subject`, `Attempt`, `SubjectType`, `Outcome`).
- Create rule set JSON `src/main/resources/rulesets/aktu-btech-sample.json` (`verified: false`).
- Implement `RuleSetLoader` with validation (sums to total credits, grade scale non-empty, valid months).
- Implement `RuleSetRegistry` and H2 backing repository for RuleSet metadata.

### Phase 2: Core Domain Engine & Unit Tests (P0)
- `GradeCalculator`: SGPA, CGPA calculations with best cleared attempt logic.
- `PromotionChecker`: Evaluate promotion rules with default limit and overrides.
- `RiskScorer`: Deterministic risk evaluation (LOW, MEDIUM, HIGH) with reasons.
- `AnalysisService`: Complete student outcome analysis.
- `CycleGenerator`: Generate upcoming exam cycles with injectable `Clock`.
- `SimulationService`: Multi-scenario graduation timeline simulation (Plan A, Plan B, Plan C).
- `RevaluationAdvisor`: Heuristic evaluation of backlog papers near pass marks.
- `DeadlineService`: Expand exam and carry-over form windows for next 12 months.
- Unit Tests: JUnit 5 test coverage for all core engine services and loader validations.

### Phase 3: REST API Controllers & DTOs (P0 / P1)
- Create DTOs and custom validation.
- Implement API endpoints:
  - `GET /api/rulesets` (P0)
  - `GET /api/rulesets/{code}` (P1)
  - `GET /api/demo-student` (P0)
  - `POST /api/analyze` (P0)
  - `POST /api/simulate` (P0)
  - `POST /api/revaluation` (P1)
  - `GET /api/deadlines` (P1)
  - `POST /api/report/pdf` (P1)
  - `POST /api/calendar/ics` (P2)
- Implement `ApiExceptionHandler` for unified standard error response.
- Seed demo student data `src/main/resources/demo/demo-student.json`.

### Phase 4: Frontend Development (P0)
- CSS Tokens (`tokens.css`), Base styles (`base.css`), Layout (`layout.css`), Routemap (`routemap.css`), Components (`components.css`).
- JavaScript module state architecture (`state.js`, `api.js`, `validators.js`, `ui.js`).
- Screens:
  - Top Bar with persistent "Sample rules, not verified" badge.
  - Screen A: Empty state with call to action & privacy note.
  - Screen B: My Results Builder (accordions, subject rows, attempt chips, localStorage autosave).
  - Screen C: Compass Dashboard with Hero SVG Metro Route Map and Summary panel.
  - Screen D: What-if Simulation with sliders/toggles and parallel mini-route lines.
  - Screen E: Revaluation Advisor Tab.
  - Screen F: Deadlines Tab.
  - Screen G: PDF Report Generation & Rules Drawer.

### Phase 5: PDF & ICS Services (P1 / P2)
- `PdfReportService` using OpenPDF to generate formatted PDF with sample warning badge & disclaimer.
- `IcsService` for exportable calendar events.

### Phase 6: Verification, End-to-End Testing & Documentation (P0)
- Run `mvn clean verify` to ensure clean build and test execution.
- Launch Spring Boot server, run end-to-end API tests via curl / web browser.
- Verify 320px, 768px, 1280px UI layouts, dark/light contrast, keyboard accessibility.
- Write documentation: `README.md`, `docs/DEMO.md`, `docs/DECISIONS.md`, `docs/ASSUMPTIONS.md`, `docs/RULES_TODO.md`.

---

## Task Checklist & Definition of Done

- [ ] `mvn clean verify` passes, all tests green.
- [ ] `mvn spring-boot:run` starts with no errors; app opens at `http://localhost:8080`.
- [ ] "Load demo student" produces populated Compass with 3 backlogs, visible spur on route map, projected date.
- [ ] What-if shows three plans with different dates; selecting one overlays on route map.
- [ ] Revaluation tab shows "Worth considering" and "Unlikely to help".
- [ ] PDF downloads, opens, and shows unverified-rules warning.
- [ ] Editing grade in My Results updates analysis and route map.
- [ ] Offline operation (no external CDN network requests).
- [ ] Privacy guaranteed: no student data saved on server or in server logs.
- [ ] All docs written: `README.md`, `docs/DEMO.md`, `docs/ASSUMPTIONS.md`, `docs/RULES_TODO.md`, `docs/DECISIONS.md`.
