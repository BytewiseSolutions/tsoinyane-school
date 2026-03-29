package com.tsoinyane.api.user;

import com.tsoinyane.api.common.BaseEntity;
import com.tsoinyane.api.common.Role;
import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.common.Title;
import com.tsoinyane.api.grade.Grade;
import com.tsoinyane.api.school.School;
import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@SuperBuilder
@ToString(callSuper = true, exclude = {"schools", "teacherGrades"})
@EqualsAndHashCode(callSuper = true, exclude = {"schools", "teacherGrades"})
public class User extends BaseEntity {

    private String studentId;

    @Enumerated(EnumType.STRING)
    private Title title;

    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String password;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @Enumerated(EnumType.STRING)
    private Status status;

    @ManyToMany
    @JoinTable(
            name = "user_school",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "school_id")
    )
    @Builder.Default
    private Set<School> schools = new HashSet<>();

    @ManyToMany
    @JoinTable(
            name = "teacher_grade",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "grade_id")
    )
    @Builder.Default
    private Set<Grade> teacherGrades = new HashSet<>();

    public String getDisplayName() {
        return (this.title != null ? this.title + " " : "")
                + this.firstName + " " + this.lastName;
    }
}
