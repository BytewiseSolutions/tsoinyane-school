package com.tsoinyane.api.lesson;

import com.tsoinyane.api.attendance.AbsenceReason;
import com.tsoinyane.api.attendance.AttendanceStatus;
import com.tsoinyane.api.common.BaseEntity;
import com.tsoinyane.api.homework.HomeworkStatus;
import com.tsoinyane.api.student.Student;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "student_lesson")
@EqualsAndHashCode(callSuper = true, exclude = {"lesson", "student"})
@ToString(callSuper = true, exclude = {"lesson", "student"})
public class StudentLesson extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_status")
    private AttendanceStatus attendanceStatus;

    @Column(length = 500)
    private String comment;

    @Enumerated(EnumType.STRING)
    @Column(name = "homework_status")
    private HomeworkStatus homeworkStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "absence_comment", length = 500)
    private String absenceComment;

    @Enumerated(EnumType.STRING)
    @Column(name = "absence_reason")
    private AbsenceReason absenceReason;
}
