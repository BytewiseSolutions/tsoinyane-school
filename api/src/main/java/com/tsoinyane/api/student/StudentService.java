package com.tsoinyane.api.student;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;

    @Transactional(readOnly = true)
    public List<StudentDto> getStudents(Long schoolId) {
        return studentRepository.findAllBySchoolId(schoolId).stream()
                .map(this::toDto)
                .toList();
    }

    private StudentDto toDto(Student student) {
        String displayName = student.getUser() != null
                ? ((student.getUser().getFirstName() != null ? student.getUser().getFirstName() : "") + " "
                + (student.getUser().getLastName() != null ? student.getUser().getLastName() : "")).trim()
                : null;

        return StudentDto.builder()
                .id(student.getId())
                .userId(student.getUser() != null ? student.getUser().getId() : null)
                .studentNumber(student.getStudentNumber())
                .userFullName(displayName)
                .userEmail(student.getUser() != null ? student.getUser().getEmail() : null)
                .userPhone(student.getUser() != null ? student.getUser().getPhone() : null)
                .schoolId(student.getSchool() != null ? student.getSchool().getId() : null)
                .schoolName(student.getSchool() != null ? student.getSchool().getName() : null)
                .gradeId(student.getGrade() != null ? student.getGrade().getId() : null)
                .gradeName(student.getGrade() != null ? student.getGrade().getName() : null)
                .build();
    }
}
