package com.tsoinyane.api.timetable;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimetableRegenerationResultDto {
    private int deletedLessonsCount;
    private int deletedStudentLessonsCount;
    private int createdLessonsCount;
    private int retainedPastLessonsCount;
}
