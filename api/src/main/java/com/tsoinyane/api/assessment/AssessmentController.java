package com.tsoinyane.api.assessment;

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
@RequestMapping("/assessment")
@RequiredArgsConstructor
public class AssessmentController {

    private final AssessmentService assessmentService;

    @GetMapping
    public List<AssessmentDto> getAssessments(
            @RequestParam(value = "schoolId", required = false) Long schoolId,
            @RequestParam(value = "subjectAssignmentId", required = false) Long subjectAssignmentId,
            @RequestParam(value = "teacherId", required = false) Long teacherId
    ) {
        return assessmentService.getAssessments(schoolId, subjectAssignmentId, teacherId);
    }

    @GetMapping("/{id}")
    public AssessmentDto getAssessment(@PathVariable Long id) {
        return assessmentService.getAssessment(id);
    }

    @PostMapping
    public AssessmentDto createAssessment(@RequestBody AssessmentDto request) {
        return assessmentService.createAssessment(request);
    }

    @PutMapping("/{id}")
    public AssessmentDto updateAssessment(@PathVariable Long id, @RequestBody AssessmentDto request) {
        return assessmentService.updateAssessment(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAssessment(@PathVariable Long id) {
        assessmentService.deleteAssessment(id);
    }

    @GetMapping("/{id}/marks")
    public List<AssessmentMarkDto> getAssessmentMarks(@PathVariable Long id) {
        return assessmentService.getAssessmentMarks(id);
    }

    @PutMapping("/{id}/marks")
    public List<AssessmentMarkDto> saveAssessmentMarks(@PathVariable Long id, @RequestBody List<AssessmentMarkDto> request) {
        return assessmentService.saveAssessmentMarks(id, request);
    }
}
