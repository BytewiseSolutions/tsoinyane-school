package com.tsoinyane.api.fee;

import com.tsoinyane.api.common.BaseEntity;
import com.tsoinyane.api.grade.Grade;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.Term;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
@Table(name = "fee_structure", uniqueConstraints = @UniqueConstraint(columnNames = {"school_id", "grade_id", "term", "academic_year"}))
@EqualsAndHashCode(callSuper = true, exclude = {"school", "grade"})
@ToString(callSuper = true, exclude = {"school", "grade"})
public class FeeStructure extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grade_id", nullable = false)
    private Grade grade;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Term term;

    @Column(name = "academic_year", nullable = false, length = 10)
    private String academicYear;

    @Column(name = "registration_fee", nullable = false)
    private Double registrationFee;

    @Column(name = "school_fee", nullable = false)
    private Double schoolFee;

    @Column(name = "exam_fee", nullable = false)
    private Double examFee;

    @Column(nullable = false)
    private Double amount;

}
