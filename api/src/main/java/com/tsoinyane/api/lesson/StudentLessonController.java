package com.tsoinyane.api.lesson;

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
@RequestMapping("/student-lesson")
@RequiredArgsConstructor
public class StudentLessonController {

    private final StudentLessonService studentLessonService;

    @GetMapping
    public List<StudentLessonDto> getStudentLessons(@RequestParam(value = "lessonId", required = false) Long lessonId) {
        return studentLessonService.getStudentLessons(lessonId);
    }

    @GetMapping("/{id}")
    public StudentLessonDto getStudentLesson(@PathVariable Long id) {
        return studentLessonService.getStudentLesson(id);
    }

    @PostMapping
    public StudentLessonDto createStudentLesson(@RequestBody StudentLessonDto request) {
        return studentLessonService.createStudentLesson(request);
    }

    @PutMapping("/{id}")
    public StudentLessonDto updateStudentLesson(@PathVariable Long id, @RequestBody StudentLessonDto request) {
        return studentLessonService.updateStudentLesson(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStudentLesson(@PathVariable Long id) {
        studentLessonService.deleteStudentLesson(id);
    }
}
