package com.tsoinyane.api.school;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record SchoolRequest(
        @NotBlank(message = "School name is required")
        String name,

        String code,
        String location,

        @Email(message = "Invalid email address")
        String email,

        String phone,
        SchoolType type,
        String academicYear,
        Term currentTerm,

        @Min(value = 0, message = "Passing mark must be between 0 and 100")
        @Max(value = 100, message = "Passing mark must be between 0 and 100")
        Integer passingMark,

        @Min(value = 0, message = "Attendance threshold must be between 0 and 100")
        @Max(value = 100, message = "Attendance threshold must be between 0 and 100")
        Integer attendanceThreshold,

        String language
) {}
