package com.tsoinyane.api.user;

import com.tsoinyane.api.common.BaseDto;
import com.tsoinyane.api.common.Role;
import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.common.Title;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.List;

@SuperBuilder
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class UserDto extends BaseDto {

    private String studentId;
    private Title title;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;
    private List<Role> roles;
    private Status status;

    private List<Long> schoolIds;
    private List<String> schoolNames;
}
