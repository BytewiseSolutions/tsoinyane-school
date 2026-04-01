package com.tsoinyane.api.report;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/report")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/student/{userId}")
    public StudentReportDto getStudentReport(@PathVariable Long userId) {
        return reportService.getStudentReport(userId);
    }

    @GetMapping("/grade/{gradeId}")
    public List<StudentReportDto> getGradeReport(
            @PathVariable Long gradeId,
            @RequestParam Long schoolId
    ) {
        return reportService.getGradeReport(gradeId, schoolId);
    }
}
