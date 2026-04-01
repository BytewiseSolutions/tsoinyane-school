package com.tsoinyane.api.school;

import com.tsoinyane.api.common.BaseEntity;
import com.tsoinyane.api.user.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@ToString(callSuper = true, exclude = "users")
@EqualsAndHashCode(callSuper = true, exclude = "users")
public class School extends BaseEntity {

    private String code;
    private String name;
    private String email;
    private String phone;
    private String location;

    @Column(name = "academic_year", length = 10)
    private String academicYear;

    @Column(name = "current_term", length = 20)
    @Enumerated(EnumType.STRING)
    private Term currentTerm;

    @Column(name = "passing_mark")
    private Integer passingMark;

    @Column(name = "attendance_threshold")
    private Integer attendanceThreshold;

    @Column(length = 20)
    private String language;

    @Enumerated(EnumType.STRING)
    private SchoolType type;

    @ManyToMany(mappedBy = "schools")
    @Builder.Default
    private Set<User> users = new HashSet<>();
}
