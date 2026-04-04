package com.tsoinyane.api.assessment;

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
public class AssessmentMarkDto extends BaseDto {

    private Long assessmentId;
    private Long studentId;
    private String studentName;
    private String studentNumber;
    private Long gradeId;
    private String gradeName;

    private Double score;
    private Double percentage;
    private Boolean passed;
    private Double totalMarks;
    private Double passMark;
    private String comment;
}
