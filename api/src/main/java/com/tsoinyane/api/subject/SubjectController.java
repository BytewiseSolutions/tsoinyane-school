package com.tsoinyane.api.subject;

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
@RequestMapping("/subject")
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjectService;

    @GetMapping
    public List<SubjectDto> getSubjects(@RequestParam(value = "schoolId", required = false) Long schoolId) {
        return subjectService.getSubjects(schoolId);
    }

    @GetMapping("/{id}")
    public SubjectDto getSubject(@PathVariable Long id) {
        return subjectService.getSubject(id);
    }

    @PostMapping
    public SubjectDto createSubject(@RequestBody SubjectDto request) {
        return subjectService.createSubject(request);
    }

    @PutMapping("/{id}")
    public SubjectDto updateSubject(@PathVariable Long id, @RequestBody SubjectDto request) {
        return subjectService.updateSubject(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSubject(@PathVariable Long id) {
        subjectService.deleteSubject(id);
    }
}
