package com.tsoinyane.api.teacher;

import com.tsoinyane.api.common.BaseDto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class TeacherDto extends BaseDto {

    private Long userId;
    private String userFullName;
    private String userEmail;
    private String userPhone;
    private java.util.List<Long> gradeIds;
    private java.util.List<String> gradeNames;
}
