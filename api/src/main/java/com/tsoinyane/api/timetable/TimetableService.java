package com.tsoinyane.api.timetable;

import com.tsoinyane.api.school.School;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.subject.Subject;
import com.tsoinyane.api.subject.SubjectRepository;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final SubjectRepository subjectRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<TimetableDto> getTimetables(Long subjectId) {
        return timetableRepository.findAllBySubjectId(subjectId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public TimetableDto getTimetable(Long id) {
        return timetableRepository.findWithAssociationsById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Timetable not found: " + id));
    }

    @Transactional
    public TimetableDto createTimetable(TimetableDto request) {
        Subject subject = resolveSubject(request.getSubjectId());
        validateTimes(request.getStartTime(), request.getEndTime());
        Set<Student> students = resolveStudents(subject);
        User actor = currentUserService.getCurrentUser();

        Timetable timetable = Timetable.builder()
                .dayOfWeek(requireDayOfWeek(request))
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .subject(subject)
                .students(students)
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        return toDto(timetableRepository.save(timetable));
    }

    @Transactional
    public TimetableDto updateTimetable(Long id, TimetableDto request) {
        Timetable timetable = timetableRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Timetable not found: " + id));

        Subject subject = resolveSubject(request.getSubjectId());
        validateTimes(request.getStartTime(), request.getEndTime());
        Set<Student> students = resolveStudents(subject);
        User actor = currentUserService.getCurrentUser();

        timetable.setDayOfWeek(requireDayOfWeek(request));
        timetable.setStartTime(request.getStartTime());
        timetable.setEndTime(request.getEndTime());
        timetable.setSubject(subject);
        timetable.setStudents(students);
        timetable.setUpdatedBy(actor);

        return toDto(timetableRepository.save(timetable));
    }

    @Transactional
    public void deleteTimetable(Long id) {
        if (!timetableRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Timetable not found: " + id);
        }

        timetableRepository.deleteById(id);
    }

    private Subject resolveSubject(Long subjectId) {
        if (subjectId == null || subjectId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject is required");
        }

        return subjectRepository.findWithStudentsById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid subjectId: " + subjectId));
    }

    private Set<Student> resolveStudents(Subject subject) {
        Set<Student> students = subject.getStudents() == null
                ? new LinkedHashSet<>()
                : new LinkedHashSet<>(subject.getStudents());

        if (students.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assign students to the subject before creating a timetable");
        }

        School school = subject.getSchool();
        List<Long> invalidSchoolIds = students.stream()
                .filter(student -> student.getSchool() == null || school == null || !student.getSchool().getId().equals(school.getId()))
                .map(Student::getId)
                .toList();
        if (!invalidSchoolIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Some assigned students do not belong to the subject school: " + invalidSchoolIds);
        }

        return students;
    }

    private void validateTimes(LocalTime startTime, LocalTime endTime) {
        if (startTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time is required");
        }
        if (endTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time is required");
        }
        if (!startTime.isBefore(endTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time must be before end time");
        }
    }

    private java.time.DayOfWeek requireDayOfWeek(TimetableDto request) {
        if (request.getDayOfWeek() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Day of week is required");
        }

        return request.getDayOfWeek();
    }

    private TimetableDto toDto(Timetable timetable) {
        Subject subject = timetable.getSubject();
        School school = subject != null ? subject.getSchool() : null;

        return TimetableDto.builder()
                .id(timetable.getId())
                .createdAt(timetable.getCreatedAt())
                .updatedAt(timetable.getUpdatedAt())
                .createdById(timetable.getCreatedBy() != null ? timetable.getCreatedBy().getId() : null)
                .createdByName(timetable.getCreatedBy() != null ? timetable.getCreatedBy().getDisplayName() : null)
                .updatedById(timetable.getUpdatedBy() != null ? timetable.getUpdatedBy().getId() : null)
                .updatedByName(timetable.getUpdatedBy() != null ? timetable.getUpdatedBy().getDisplayName() : null)
                .schoolId(school != null ? school.getId() : null)
                .schoolName(school != null ? school.getName() : null)
                .dayOfWeek(timetable.getDayOfWeek())
                .startTime(timetable.getStartTime())
                .endTime(timetable.getEndTime())
                .subjectId(subject != null ? subject.getId() : null)
                .subjectName(subject != null ? subject.getName() : null)
                .studentIds(timetable.getStudents().stream().map(Student::getId).toList())
                .build();
    }
}
