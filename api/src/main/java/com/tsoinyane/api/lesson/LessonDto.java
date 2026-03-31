package com.tsoinyane.api.lesson;

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
public class LessonDto extends BaseDto {
    private String cancellationReason;
    private LocalDateTime date;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LessonStatus status;
    private Boolean submitted;
    private Long subjectId;
    private String subjectName;
    private Long teacherId;
    private String teacherName;
    private Long timetableId;
}
