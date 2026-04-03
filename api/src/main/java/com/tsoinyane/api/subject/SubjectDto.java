package com.tsoinyane.api.subject;

import com.tsoinyane.api.common.BaseDto;
import com.tsoinyane.api.common.Status;
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
public class SubjectDto extends BaseDto {
    private String code;
    private String name;
    private Long gradeId;
    private String gradeName;
    private Long teacherId;
    private String teacherName;
    private Integer studentCount;
    private Status status;
}
