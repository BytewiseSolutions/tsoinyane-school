package com.tsoinyane.api.timetable;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/timetable")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;

    @GetMapping
    public List<TimetableDto> getTimetables(@RequestParam(value = "subjectId", required = false) Long subjectId) {
        return timetableService.getTimetables(subjectId);
    }

    @GetMapping("/{id}")
    public TimetableDto getTimetable(@PathVariable Long id) {
        return timetableService.getTimetable(id);
    }

    @PostMapping
    public TimetableDto createTimetable(@RequestBody TimetableDto request) {
        return timetableService.createTimetable(request);
    }

    @PutMapping("/{id}")
    public TimetableDto updateTimetable(@PathVariable Long id, @RequestBody TimetableDto request) {
        return timetableService.updateTimetable(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTimetable(@PathVariable Long id) {
        timetableService.deleteTimetable(id);
    }
}
