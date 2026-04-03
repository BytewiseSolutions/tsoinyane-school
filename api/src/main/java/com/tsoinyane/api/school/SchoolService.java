package com.tsoinyane.api.school;

import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.user.User;
import com.tsoinyane.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SchoolService {
    private static final ZoneId SCHOOL_ZONE = ZoneId.of("Africa/Maseru");

    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    public List<SchoolDto> getAllSchools() {
        return schoolRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public SchoolDto updateSchool(Long id, SchoolRequest request) {
        School school = schoolRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "School not found."));

        User currentUser = currentUserService.getCurrentUser();
        school.setName(request.name().trim());
        school.setCode(request.code());
        school.setLocation(request.location());
        school.setEmail(request.email());
        school.setPhone(request.phone());
        school.setType(request.type());
        school.setAcademicYear(request.academicYear());
        school.setCurrentTerm(request.currentTerm());
        school.setPassingMark(request.passingMark());
        school.setAttendanceThreshold(request.attendanceThreshold());
        school.setLanguage(request.language());
        school.setUpdatedBy(currentUser);

        return toDto(schoolRepository.save(school));
    }

    @PostConstruct
    public void createDefaultSchools() {
        if (schoolRepository.count() == 0) {
            User adminUser = userRepository.findByEmail("admin@tsoinyane.co.ls").orElse(null);

            School tps = School.builder()
                    .code("TPS")
                    .name("Tsoinyane Primary School")
                    .email("info@tps.co.ls")
                    .phone("+266 63274567")
                    .type(SchoolType.PRIMARY)
                    .createdBy(adminUser)
                    .updatedBy(adminUser)
                    .build();

            School high = School.builder()
                    .code("THS")
                    .name("Tsoinyane High School")
                    .email("info@ths.co.ls")
                    .phone("+266 59181664")
                    .type(SchoolType.HIGH)
                    .createdBy(adminUser)
                    .updatedBy(adminUser)
                    .build();

            schoolRepository.saveAll(Arrays.asList(tps, high));

            if (adminUser != null) {
                adminUser.getSchools().add(tps);
                adminUser.getSchools().add(high);
                userRepository.save(adminUser);
            }
        }
    }

    private SchoolDto toDto(School school) {
        Term effectiveCurrentTerm = resolveEffectiveCurrentTerm(school);
        return SchoolDto.builder()
                .id(school.getId())
                .createdAt(school.getCreatedAt())
                .updatedAt(school.getUpdatedAt())
                .code(school.getCode())
                .name(school.getName())
                .email(school.getEmail())
                .phone(school.getPhone())
                .location(school.getLocation())
                .academicYear(school.getAcademicYear())
                .currentTerm(effectiveCurrentTerm)
                .passingMark(school.getPassingMark())
                .attendanceThreshold(school.getAttendanceThreshold())
                .language(school.getLanguage())
                .type(school.getType())
                .build();
    }

    private Term resolveEffectiveCurrentTerm(School school) {
        String academicYear = school.getAcademicYear() != null ? school.getAcademicYear().trim() : "";
        String currentYear = String.valueOf(LocalDate.now(SCHOOL_ZONE).getYear());

        if (academicYear.equals(currentYear)) {
            return resolveCalendarTerm(LocalDate.now(SCHOOL_ZONE).getMonthValue());
        }

        return school.getCurrentTerm() != null
                ? school.getCurrentTerm()
                : resolveCalendarTerm(LocalDate.now(SCHOOL_ZONE).getMonthValue());
    }

    private Term resolveCalendarTerm(int month) {
        if (month <= 3) {
            return Term.TERM_1;
        }
        if (month <= 6) {
            return Term.TERM_2;
        }
        if (month <= 9) {
            return Term.TERM_3;
        }
        return Term.TERM_4;
    }
}
