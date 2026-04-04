package com.tsoinyane.api.assessment;

import com.tsoinyane.api.common.BaseEntity;
import com.tsoinyane.api.subjectassignment.SubjectAssignment;
import com.tsoinyane.api.teacher.Teacher;
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
@Table(name = "assessment")
@EqualsAndHashCode(callSuper = true, exclude = {"subjectAssignment", "teacher"})
@ToString(callSuper = true, exclude = {"subjectAssignment", "teacher"})
public class Assessment extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 1500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AssessmentType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AssessmentStatus status;

    @Column(name = "assessment_date")
    private LocalDateTime assessmentDate;

    @Column(name = "total_marks", nullable = false)
    private Double totalMarks;

    @Column(name = "pass_mark")
    private Double passMark;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_assignment_id", nullable = false)
    private SubjectAssignment subjectAssignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;
}
