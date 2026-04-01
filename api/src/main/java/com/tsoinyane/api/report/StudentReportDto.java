package com.tsoinyane.api.report;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class StudentReportDto {
    Long studentId;
    String studentNumber;
    String studentName;
    String gradeName;
    String schoolName;
    int totalLessons;
    int totalPresent;
    int totalAbsent;
    int totalLate;
    int totalHomeworkDone;
    int totalHomeworkNotDone;
    double attendanceRate;
    double homeworkRate;
    List<SubjectReportDto> subjects;

    @Value
    @Builder
    public static class SubjectReportDto {
        Long subjectId;
        String subjectName;
        String subjectCode;
        String teacherName;
        int totalLessons;
        int present;
        int absent;
        int late;
        int homeworkDone;
        int homeworkNotDone;
        double attendanceRate;
        double homeworkRate;
    }
}
