package com.tsoinyane.api.subjectassignment;

import com.tsoinyane.api.student.StudentDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/subject-assignment")
@RequiredArgsConstructor
public class SubjectAssignmentController {

    private final SubjectAssignmentService subjectAssignmentService;

    @GetMapping
    public List<SubjectAssignmentDto> getAssignments(@RequestParam(value = "schoolId", required = false) Long schoolId) {
        return subjectAssignmentService.getAssignments(schoolId);
    }

    @GetMapping("/{id}")
    public SubjectAssignmentDto getAssignment(@PathVariable Long id) {
        return subjectAssignmentService.getAssignment(id);
    }

    @PostMapping
    public SubjectAssignmentDto createAssignment(@RequestBody SubjectAssignmentDto request) {
        return subjectAssignmentService.createAssignment(request);
    }

    @PutMapping("/{id}")
    public SubjectAssignmentDto updateAssignment(@PathVariable Long id, @RequestBody SubjectAssignmentDto request) {
        return subjectAssignmentService.updateAssignment(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAssignment(@PathVariable Long id) {
        subjectAssignmentService.deleteAssignment(id);
    }

    @GetMapping("/{id}/students")
    public List<StudentDto> getAssignmentStudents(@PathVariable Long id) {
        return subjectAssignmentService.getAssignmentStudents(id);
    }

    @PutMapping("/{id}/students")
    public List<StudentDto> updateAssignmentStudents(@PathVariable Long id, @RequestBody List<Long> studentIds) {
        return subjectAssignmentService.updateAssignmentStudents(id, studentIds);
    }
}
