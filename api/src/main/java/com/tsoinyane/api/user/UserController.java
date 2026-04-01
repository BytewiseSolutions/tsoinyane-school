package com.tsoinyane.api.user;

import com.tsoinyane.api.common.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public UserDto getProfile() {
        return userService.getProfile();
    }

    @PutMapping("/me")
    public UserDto updateProfile(@RequestBody UserDto request) {
        return userService.updateProfile(request);
    }

    @GetMapping
    public List<UserDto> getUsers(
            @RequestParam(value = "schoolId", required = false) Long schoolId,
            @RequestParam(value = "role", required = false) Role role
    ) {
        return userService.getUsers(schoolId, role);
    }

    @GetMapping("/{id}")
    public UserDto getUser(@PathVariable("id") Long id) {
        return userService.getUserById(id);
    }

    @PostMapping
    public UserDto createUser(@RequestBody UserDto request) {
        return userService.createUser(request);
    }

    @PutMapping("/{id}")
    public UserDto updateUser(@PathVariable("id") Long id, @RequestBody UserDto request) {
        return userService.updateUser(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable("id") Long id) {
        userService.deleteUser(id);
    }
}
