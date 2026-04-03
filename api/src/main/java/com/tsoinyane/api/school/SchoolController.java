package com.tsoinyane.api.school;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class SchoolController {

    private final SchoolService schoolService;

    @GetMapping("/school")
    public List<SchoolDto> getSchools() {
        return schoolService.getAllSchools();
    }

    @GetMapping("/public/schools")
    public List<SchoolDto> getPublicSchools() {
        return schoolService.getPublicSchools();
    }

    @PutMapping("/school/{id}")
    @Secured({"ROLE_SYSTEM_ADMIN", "ROLE_SCHOOL_ADMIN"})
    public SchoolDto updateSchool(@PathVariable Long id, @Valid @RequestBody SchoolRequest request) {
        return schoolService.updateSchool(id, request);
    }
}
