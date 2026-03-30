package com.tsoinyane.api.teacher;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/teacher")
@RequiredArgsConstructor
public class TeacherController {

    private final TeacherService teacherService;

    @GetMapping
    public List<TeacherDto> getTeachers(@RequestParam(value = "schoolId", required = false) Long schoolId) {
        return teacherService.getTeachers(schoolId);
    }

    @PostMapping
    public TeacherDto createTeacher(@RequestBody TeacherDto request) {
        return teacherService.createTeacher(request);
    }
}
