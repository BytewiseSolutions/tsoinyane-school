package com.tsoinyane.api.user;

import com.tsoinyane.api.common.Role;
import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.common.Title;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final PasswordEncoder passwordEncoder;

    @PostConstruct
    public void createDefaultAdmin() {
        User admin = userRepository.findByEmail("admin@tsoinyane.co.ls")
                .orElseGet(() -> {
                    User newAdmin = new User();
                    newAdmin.setTitle(Title.Mr);
                    newAdmin.setFirstName("Lebohang");
                    newAdmin.setLastName("Monamane");
                    newAdmin.setEmail("admin@tsoinyane.co.ls");
                    newAdmin.setPhone("59181664");
                    newAdmin.setPassword(passwordEncoder.encode("admin123"));
                    newAdmin.setRole(Role.SYSTEM_ADMIN);
                    newAdmin.setStatus(Status.ACTIVE);
                    return newAdmin;
                });

        boolean changed = false;

        if (admin.getId() == null) {
            admin = userRepository.save(admin);
            changed = true;
        }

        List<School> schools = schoolRepository.findAll();
        if (!schools.isEmpty()) {
            admin.setSchools(new HashSet<>(schools));
            changed = true;
        }

        if (admin.getCreatedBy() == null) {
            admin.setCreatedBy(admin);
            changed = true;
        }
        if (admin.getUpdatedBy() == null) {
            admin.setUpdatedBy(admin);
            changed = true;
        }

        if (changed) {
            userRepository.save(admin);
            System.out.println("Default system admin synced with schools and audit fields");
        }

        boolean schoolsChanged = false;
        for (School school : schools) {
            if (school.getCreatedBy() == null) {
                school.setCreatedBy(admin);
                schoolsChanged = true;
            }
            if (school.getUpdatedBy() == null) {
                school.setUpdatedBy(admin);
                schoolsChanged = true;
            }
        }
        if (schoolsChanged) {
            schoolRepository.saveAll(schools);
            System.out.println("Default schools audit fields synced to system admin");
        }
    }
}
