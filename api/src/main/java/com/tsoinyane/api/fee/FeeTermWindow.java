package com.tsoinyane.api.fee;

import com.tsoinyane.api.common.BaseEntity;
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

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(
        name = "fee_term_window",
        uniqueConstraints = @UniqueConstraint(columnNames = {"school_id", "term", "academic_year"})
)
@EqualsAndHashCode(callSuper = true, exclude = {"school"})
@ToString(callSuper = true, exclude = {"school"})
public class FeeTermWindow extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Term term;

    @Column(name = "academic_year", nullable = false, length = 10)
    private String academicYear;

    @Column(name = "opening_date")
    private LocalDate openingDate;

    @Column(name = "closing_date")
    private LocalDate closingDate;
}
