package com.tsoinyane.api.school;

import com.tsoinyane.api.common.BaseDto;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class SchoolDto extends BaseDto {

    private String code;
    private String name;
    private String email;
    private String phone;
    private String location;
    private String academicYear;
    private Term currentTerm;
    private Integer passingMark;
    private Integer attendanceThreshold;
    private String language;
    private SchoolType type;

    private List<Long> userIds;
    private List<String> userNames;
}