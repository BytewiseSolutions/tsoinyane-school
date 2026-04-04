package com.tsoinyane.api.student;

import com.tsoinyane.api.common.BaseEntity;
import com.tsoinyane.api.grade.Grade;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.user.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@EqualsAndHashCode(callSuper = true, exclude = {"user", "school", "grade"})
@ToString(callSuper = true, exclude = {"user", "school", "grade"})
public class Student extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grade_id")
    private Grade grade;

    @Column(nullable = false, unique = true)
    private String studentNumber;
}
