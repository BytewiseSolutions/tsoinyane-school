package com.tsoinyane.api.dashboard;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class DashboardStatsDto {
    long totalStudents;
    long totalTeachers;
    long totalGrades;
    long totalSubjects;
    long totalSchools;
    List<DashboardRecentStudentDto> recentStudents;
}
