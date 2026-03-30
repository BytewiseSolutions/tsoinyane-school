package com.tsoinyane.api.subject;

import com.tsoinyane.api.common.BaseEntity;
import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.grade.Grade;
import com.tsoinyane.api.school.School;
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

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "subject")
@EqualsAndHashCode(callSuper = true, exclude = {"school", "grade", "teacher"})
@ToString(callSuper = true, exclude = {"school", "grade", "teacher"})
public class Subject extends BaseEntity {

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grade_id", nullable = false)
    private Grade grade;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
}
