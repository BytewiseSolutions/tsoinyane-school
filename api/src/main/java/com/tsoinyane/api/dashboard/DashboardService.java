package com.tsoinyane.api.dashboard;

import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.grade.GradeRepository;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.student.StudentRepository;
import com.tsoinyane.api.teacher.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final GradeRepository gradeRepository;
    private final SchoolRepository schoolRepository;

    public DashboardStatsDto getDashboardStats(Long schoolId) {
        return DashboardStatsDto.builder()
                .totalStudents(studentRepository.countBySchoolId(schoolId))
                .totalTeachers(teacherRepository.countBySchoolId(schoolId))
                .totalGrades(gradeRepository.countBySchoolId(schoolId))
                .totalSchools(schoolId == null ? schoolRepository.count() : schoolRepository.countById(schoolId))
                .recentStudents(studentRepository.findRecentForDashboard(schoolId, PageRequest.of(0, 5)).stream()
                        .map(this::toRecentStudentDto)
                        .toList())
                .build();
    }

    private DashboardRecentStudentDto toRecentStudentDto(Student student) {
        String firstName = student.getUser() != null && student.getUser().getFirstName() != null
                ? student.getUser().getFirstName().trim()
                : "";
        String lastName = student.getUser() != null && student.getUser().getLastName() != null
                ? student.getUser().getLastName().trim()
                : "";
        String fullName = (firstName + " " + lastName).trim();

        return DashboardRecentStudentDto.builder()
                .id(student.getId())
                .name(fullName.isBlank() ? "Unknown Student" : fullName)
                .school(student.getSchool() != null ? student.getSchool().getName() : "N/A")
                .grade(student.getGrade() != null ? student.getGrade().getName() : "N/A")
                .status(formatStatus(student.getUser() != null ? student.getUser().getStatus() : null))
                .build();
    }

    private String formatStatus(Status status) {
        if (status == null) {
            return "Unknown";
        }

        return switch (status) {
            case ACTIVE -> "Active";
            case INACTIVE -> "Inactive";
            case PENDING -> "Pending";
            case DELETED -> "Deleted";
        };
    }
}
