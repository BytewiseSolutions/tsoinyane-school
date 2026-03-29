package com.tsoinyane.api.user;

import com.tsoinyane.api.common.Role;
import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.common.Title;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserDto> getAllUsers() {
        return userRepository.findAllByOrderByIdAsc().stream()
                .map(this::toDto)
                .toList();
    }

    public UserDto createUser(UserDto request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        if (normalizedEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }

        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        if (request.getFirstName() == null || request.getFirstName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "First name is required");
        }

        if (request.getLastName() == null || request.getLastName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Last name is required");
        }

        Set<Role> roles = resolveRoles(request.getRoles());
        Status status = request.getStatus() != null ? request.getStatus() : Status.ACTIVE;
        String studentId = roles.contains(Role.STUDENT) ? generateNextStudentId() : null;

        Set<School> schools = resolveSchools(request.getSchoolIds());
        User auditUser = userRepository.findByEmail("admin@tsoinyane.co.ls").orElse(null);

        User newUser = User.builder()
                .studentId(studentId)
                .title(request.getTitle())
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .email(normalizedEmail)
                .phone(trimToNull(request.getPhone()))
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(roles)
                .status(status)
                .schools(schools)
                .createdBy(auditUser)
                .updatedBy(auditUser)
                .build();

        User savedUser = userRepository.save(newUser);

        if (savedUser.getCreatedBy() == null || savedUser.getUpdatedBy() == null) {
            savedUser.setCreatedBy(savedUser);
            savedUser.setUpdatedBy(savedUser);
            savedUser = userRepository.save(savedUser);
        }

        return toDto(savedUser);
    }

    public UserDto updateUser(Long id, UserDto request) {
        User existingUser = userRepository.findWithSchoolsAndRolesById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String normalizedEmail = normalizeEmail(request.getEmail());
        if (normalizedEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        if (request.getFirstName() == null || request.getFirstName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "First name is required");
        }

        if (request.getLastName() == null || request.getLastName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Last name is required");
        }

        userRepository.findByEmail(normalizedEmail).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
            }
        });

        existingUser.setStudentId(trimToNull(request.getStudentId()));
        existingUser.setTitle(request.getTitle());
        existingUser.setFirstName(request.getFirstName().trim());
        existingUser.setLastName(request.getLastName().trim());
        existingUser.setEmail(normalizedEmail);
        existingUser.setPhone(trimToNull(request.getPhone()));
        existingUser.setStatus(request.getStatus() != null ? request.getStatus() : existingUser.getStatus());

        Set<Role> roles = resolveRoles(request.getRoles());
        existingUser.setRoles(roles);

        if (roles.contains(Role.STUDENT)) {
            if (existingUser.getStudentId() == null || existingUser.getStudentId().isBlank()) {
                existingUser.setStudentId(generateNextStudentId());
            }
        } else {
            existingUser.setStudentId(null);
        }

        if (request.getSchoolIds() != null) {
            existingUser.setSchools(resolveSchools(request.getSchoolIds()));
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            existingUser.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        User savedUser = userRepository.save(existingUser);
        return toDto(savedUser);
    }

    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        userRepository.delete(user);
    }

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
                    newAdmin.setRoles(new HashSet<>(Set.of(Role.SYSTEM_ADMIN)));
                    newAdmin.setStatus(Status.ACTIVE);
                    return newAdmin;
                });

        boolean changed = false;

        if (admin.getId() == null) {
            admin = userRepository.save(admin);
            changed = true;
        }

        if (admin.getRoles() == null || admin.getRoles().isEmpty()) {
            admin.setRoles(new HashSet<>(Set.of(Role.SYSTEM_ADMIN)));
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

    private UserDto toDto(User user) {
        List<Long> schoolIds = user.getSchools().stream()
                .map(School::getId)
                .sorted()
                .toList();

        List<String> schoolNames = user.getSchools().stream()
                .map(School::getName)
                .filter(name -> name != null && !name.isBlank())
                .sorted(Comparator.naturalOrder())
                .toList();

        return UserDto.builder()
                .id(user.getId())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .studentId(user.getStudentId())
                .title(user.getTitle())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .roles(user.getRoles().stream().sorted().toList())
                .status(user.getStatus())
                .schoolIds(schoolIds)
                .schoolNames(schoolNames)
                .build();
    }

    private Set<Role> resolveRoles(List<Role> requestedRoles) {
        if (requestedRoles == null || requestedRoles.isEmpty()) {
            return new LinkedHashSet<>(Set.of(Role.STUDENT));
        }

        return requestedRoles.stream()
                .filter(role -> role != null)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<School> resolveSchools(List<Long> schoolIds) {
        if (schoolIds == null || schoolIds.isEmpty()) {
            return new HashSet<>();
        }

        List<Long> uniqueIds = schoolIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        if (uniqueIds.isEmpty()) {
            return new HashSet<>();
        }

        List<School> schools = schoolRepository.findAllById(uniqueIds);
        if (schools.size() != uniqueIds.size()) {
            Set<Long> foundIds = schools.stream().map(School::getId).collect(Collectors.toSet());
            List<Long> missingIds = uniqueIds.stream().filter(id -> !foundIds.contains(id)).toList();
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid schoolIds: " + missingIds);
        }

        return new HashSet<>(schools);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String generateNextStudentId() {
        int max = userRepository.findAllStudentIds().stream()
                .map(String::trim)
                .map(id -> id.toUpperCase().replaceFirst("^ST", ""))
                .filter(part -> part.matches("\\d+"))
                .mapToInt(Integer::parseInt)
                .max()
                .orElse(0);

        int next = max + 1;
        return "ST" + String.format("%03d", next);
    }
}
