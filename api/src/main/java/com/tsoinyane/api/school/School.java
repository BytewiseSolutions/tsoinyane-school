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

    @Enumerated(EnumType.STRING)
    private SchoolType type;

    @ManyToMany(mappedBy = "schools")
    @Builder.Default
    private Set<User> users = new HashSet<>();
}
