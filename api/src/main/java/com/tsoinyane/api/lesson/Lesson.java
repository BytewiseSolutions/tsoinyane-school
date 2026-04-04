package com.tsoinyane.api.lesson;

import com.tsoinyane.api.common.BaseEntity;
import com.tsoinyane.api.subjectassignment.SubjectAssignment;
import com.tsoinyane.api.teacher.Teacher;
import com.tsoinyane.api.timetable.Timetable;
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

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "lesson")
@EqualsAndHashCode(callSuper = true, exclude = {"subjectAssignment", "teacher", "timetable"})
@ToString(callSuper = true, exclude = {"subjectAssignment", "teacher", "timetable"})
public class Lesson extends BaseEntity {

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    @Column(name = "date")
    private LocalDateTime date;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private LessonStatus status;

    @Column(name = "submitted", nullable = false)
    private Boolean submitted;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_assignment_id")
    private SubjectAssignment subjectAssignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timetable_id")
    private Timetable timetable;
}
