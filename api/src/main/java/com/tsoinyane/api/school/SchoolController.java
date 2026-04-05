package com.tsoinyane.api.school;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

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

    @PostMapping("/school/{id}/images/{slot}")
    @Secured({"ROLE_SYSTEM_ADMIN", "ROLE_SCHOOL_ADMIN"})
    public SchoolDto uploadSchoolImage(
            @PathVariable Long id,
            @PathVariable String slot,
            @RequestParam("file") MultipartFile file
    ) {
        return schoolService.uploadSchoolImage(id, slot, file);
    }

    @DeleteMapping("/school/{id}/images/{slot}")
    @Secured({"ROLE_SYSTEM_ADMIN", "ROLE_SCHOOL_ADMIN"})
    public SchoolDto deleteSchoolImage(@PathVariable Long id, @PathVariable String slot) {
        return schoolService.deleteSchoolImage(id, slot);
    }
}
