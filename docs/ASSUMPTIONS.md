# Architectural & Design Assumptions

1. **Rule Verification Status**: All rules in `aktu-btech-sample.json` are marked `"verified": false`. The UI and PDF report persistently display warning banners indicating sample data is in use.
2. **Font Fallbacks**: Standard system font stacks (`system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`) are used alongside standard CSS typography variables to guarantee offline operation without CDN dependencies.
3. **GPA Formula**: SGPA/CGPA formulas calculate total weighted quality points using the best cleared attempt (or latest attempt if never cleared) divided by total attempted subject credits.
4. **Stateless Server**: No student input (subjects, attempts, marks) is persisted to backend database storage or written to log outputs. Data resides strictly in browser `localStorage` and is transmitted in request bodies for stateless processing.
5. **Exam Cycle Scheduling**: Regular semester exams occur in June (Even) and December (Odd). Carry-over exams occur in September and March. Results are published with a 45-60 day delay window.
6. **Revaluation Heuristic**: Backlogs with marks within 5 marks of the passing threshold (`nearMissMarks = 5`) are flagged as "WORTH_CONSIDERING".
