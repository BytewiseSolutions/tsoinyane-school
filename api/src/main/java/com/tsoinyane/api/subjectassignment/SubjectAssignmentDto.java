package com.tsoinyane.api.subjectassignment;

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
public class SubjectAssignmentDto extends BaseDto {
    private Long subjectId;
    private String subjectCode;
    private String subjectName;
    private Long gradeId;
    private String gradeName;
    private Long teacherId;
    private String teacherName;
    private Integer studentCount;
    private Status status;
}
