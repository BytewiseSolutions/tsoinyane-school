package com.tsoinyane.api.student;

import com.tsoinyane.api.common.BaseDto;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class StudentDto extends BaseDto {

    private Long userId;
    private String userFullName;
    private String userEmail;
    private String userPhone;

    private Long schoolId;
    private String schoolName;

    private String grade;
    private String studentNumber;
}