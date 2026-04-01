package com.tsoinyane.api.report;

import com.tsoinyane.api.attendance.AttendanceStatus;
import com.tsoinyane.api.homework.HomeworkStatus;
import com.tsoinyane.api.lesson.StudentLesson;
import com.tsoinyane.api.lesson.StudentLessonRepository;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.student.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final StudentRepository studentRepository;
    private final StudentLessonRepository studentLessonRepository;

    @Transactional(readOnly = true)
    public StudentReportDto getStudentReport(Long userId) {
        Student student = studentRepository.findByUser_Id(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found."));

        List<StudentLesson> lessons = studentLessonRepository.findAllByStudentId(student.getId());

        Map<Long, List<StudentLesson>> bySubject = lessons.stream()
                .filter(sl -> sl.getLesson() != null && sl.getLesson().getSubject() != null)
                .collect(Collectors.groupingBy(sl -> sl.getLesson().getSubject().getId()));

        List<StudentReportDto.SubjectReportDto> subjectReports = bySubject.entrySet().stream()
                .map(entry -> buildSubjectReport(entry.getKey(), entry.getValue()))
                .sorted((a, b) -> a.getSubjectName().compareToIgnoreCase(b.getSubjectName()))
                .toList();

        int totalLessons = lessons.size();
        int totalPresent = (int) lessons.stream().filter(sl -> sl.getAttendanceStatus() == AttendanceStatus.PRESENT).count();
        int totalAbsent = (int) lessons.stream().filter(sl -> sl.getAttendanceStatus() == AttendanceStatus.ABSENT).count();
        int totalLate = (int) lessons.stream().filter(sl -> sl.getAttendanceStatus() == AttendanceStatus.LATE).count();
        int totalHomeworkDone = (int) lessons.stream().filter(sl -> sl.getHomeworkStatus() == HomeworkStatus.DONE).count();
        int totalHomeworkNotDone = (int) lessons.stream().filter(sl -> sl.getHomeworkStatus() == HomeworkStatus.NOT_DONE).count();

        return StudentReportDto.builder()
                .studentId(student.getId())
                .studentNumber(student.getStudentNumber())
                .studentName(student.getUser().getDisplayName())
                .gradeName(student.getGrade().getName())
                .schoolName(student.getSchool().getName())
                .totalLessons(totalLessons)
                .totalPresent(totalPresent)
                .totalAbsent(totalAbsent)
                .totalLate(totalLate)
                .totalHomeworkDone(totalHomeworkDone)
                .totalHomeworkNotDone(totalHomeworkNotDone)
                .attendanceRate(rate(totalPresent + totalLate, totalLessons))
                .homeworkRate(rate(totalHomeworkDone, totalHomeworkDone + totalHomeworkNotDone))
                .subjects(subjectReports)
                .build();
    }

    @Transactional(readOnly = true)
    public List<StudentReportDto> getGradeReport(Long gradeId, Long schoolId) {
        return studentRepository.findAllBySchoolId(schoolId).stream()
                .filter(s -> s.getGrade().getId().equals(gradeId))
                .map(s -> getStudentReport(s.getUser().getId()))
                .toList();
    }

    private StudentReportDto.SubjectReportDto buildSubjectReport(Long subjectId, List<StudentLesson> lessons) {
        var subject = lessons.get(0).getLesson().getSubject();
        var teacher = subject.getTeacher();
        int total = lessons.size();
        int present = (int) lessons.stream().filter(sl -> sl.getAttendanceStatus() == AttendanceStatus.PRESENT).count();
        int absent = (int) lessons.stream().filter(sl -> sl.getAttendanceStatus() == AttendanceStatus.ABSENT).count();
        int late = (int) lessons.stream().filter(sl -> sl.getAttendanceStatus() == AttendanceStatus.LATE).count();
        int done = (int) lessons.stream().filter(sl -> sl.getHomeworkStatus() == HomeworkStatus.DONE).count();
        int notDone = (int) lessons.stream().filter(sl -> sl.getHomeworkStatus() == HomeworkStatus.NOT_DONE).count();

        return StudentReportDto.SubjectReportDto.builder()
                .subjectId(subjectId)
                .subjectName(subject.getName())
                .subjectCode(subject.getCode())
                .teacherName(teacher != null && teacher.getUser() != null ? teacher.getUser().getDisplayName() : "N/A")
                .totalLessons(total)
                .present(present)
                .absent(absent)
                .late(late)
                .homeworkDone(done)
                .homeworkNotDone(notDone)
                .attendanceRate(rate(present + late, total))
                .homeworkRate(rate(done, done + notDone))
                .build();
    }

    private double rate(int numerator, int denominator) {
        if (denominator == 0) return 0.0;
        return Math.round((numerator * 100.0 / denominator) * 10.0) / 10.0;
    }
}
