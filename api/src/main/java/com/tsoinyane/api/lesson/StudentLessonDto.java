package com.tsoinyane.api.lesson;

import com.tsoinyane.api.attendance.AbsenceReason;
import com.tsoinyane.api.attendance.AttendanceStatus;
import com.tsoinyane.api.common.BaseDto;
import com.tsoinyane.api.homework.HomeworkStatus;
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
public class StudentLessonDto extends BaseDto {
    private Long lessonId;
    private Long studentId;
    private String studentName;
    private String studentNumber;
    private AttendanceStatus attendanceStatus;
    private HomeworkStatus homeworkStatus;
    private AbsenceReason absenceReason;
    private String comment;
    private String absenceComment;
}
