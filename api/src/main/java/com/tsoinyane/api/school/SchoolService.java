package com.tsoinyane.api.school;

import com.tsoinyane.api.user.User;
import com.tsoinyane.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
public class SchoolService {

    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;

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

            System.out.println("Default schools created and admin assigned");
        }
    }
}