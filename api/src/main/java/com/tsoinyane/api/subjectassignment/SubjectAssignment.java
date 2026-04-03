package com.tsoinyane.api.subjectassignment;

import com.tsoinyane.api.common.BaseEntity;
import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.grade.Grade;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.subject.Subject;
import com.tsoinyane.api.teacher.Teacher;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import java.util.LinkedHashSet;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(
        name = "subject_assignment",
        uniqueConstraints = @UniqueConstraint(columnNames = {"subject_id", "grade_id"})
)
@EqualsAndHashCode(callSuper = true, exclude = {"subject", "grade", "teacher", "students"})
@ToString(callSuper = true, exclude = {"subject", "grade", "teacher", "students"})
public class SubjectAssignment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grade_id", nullable = false)
    private Grade grade;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "subject_student",
            joinColumns = @JoinColumn(name = "subject_assignment_id"),
            inverseJoinColumns = @JoinColumn(name = "student_id")
    )
    @Builder.Default
    private Set<Student> students = new LinkedHashSet<>();
}
