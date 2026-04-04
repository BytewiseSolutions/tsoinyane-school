package com.tsoinyane.api.assessment;

import com.tsoinyane.api.common.BaseDto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class AssessmentDto extends BaseDto {

    private Long subjectAssignmentId;
    private Long subjectId;
    private String subjectCode;
    private String subjectName;
    private Long gradeId;
    private String gradeName;
    private Long teacherId;
    private String teacherName;

    private String title;
    private String description;
    private AssessmentType type;
    private AssessmentStatus status;
    private LocalDateTime assessmentDate;
    private Double totalMarks;
    private Double passMark;

    private Integer studentCount;
    private Integer markedCount;
    private Double averageScore;
    private Double averagePercentage;
}
