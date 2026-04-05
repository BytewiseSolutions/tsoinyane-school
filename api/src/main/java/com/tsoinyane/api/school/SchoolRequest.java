package com.tsoinyane.api.school;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.Length;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record SchoolRequest(
        @NotBlank(message = "School name is required")
        String name,

        String code,
        String location,
        String aboutHeadline,
        String aboutDescription,
        String aboutSupportingText,
        String missionText,
        String visionText,
        String valuesText,

        @Length(max = 500, message = "Hero image URL must not exceed 500 characters")
        String heroImageUrl,

        @Length(max = 500, message = "About image URL must not exceed 500 characters")
        String aboutImageUrl,

        @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
        @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
        Double mapLatitude,

        @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
        @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
        Double mapLongitude,

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
