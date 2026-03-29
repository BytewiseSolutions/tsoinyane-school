package com.tsoinyane.api.grade;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/grade")
@RequiredArgsConstructor
public class GradeController {

    private final GradeService gradeService;

    @GetMapping
    public List<GradeDto> getGrades() {
        return gradeService.getAllGrades();
    }

    @PostMapping
    public GradeDto createGrade(
            @RequestBody GradeDto request,
            @RequestHeader("X-User-Id") Long actorUserId
    ) {
        return gradeService.createGrade(request, actorUserId);
    }

    @PutMapping("/{id}")
    public GradeDto updateGrade(
            @PathVariable("id") Long id,
            @RequestBody GradeDto request,
            @RequestHeader("X-User-Id") Long actorUserId
    ) {
        return gradeService.updateGrade(id, request, actorUserId);
    }

    @DeleteMapping("/{id}")
    public void deleteGrade(@PathVariable("id") Long id) {
        gradeService.deleteGrade(id);
    }
}
