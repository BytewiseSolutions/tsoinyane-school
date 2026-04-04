package com.tsoinyane.api.timetable;

import com.tsoinyane.api.common.BaseDto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class TimetableDto extends BaseDto {
    private DayOfWeek dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private Long subjectAssignmentId;
    private Long subjectId;
    private String subjectName;
    private Long gradeId;
    private String gradeName;
    private Long teacherId;
    private String teacherName;
    private List<Long> studentIds;
    private Integer studentCount;
    private Integer lessonCount;
}
