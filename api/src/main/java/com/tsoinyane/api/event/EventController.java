package com.tsoinyane.api.event;

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
@RequestMapping("/event")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @GetMapping
    public List<EventDto> getEvents(
            @RequestParam(value = "schoolId", required = false) Long schoolId,
            @RequestParam(value = "upcoming", required = false) Boolean upcomingOnly
    ) {
        return eventService.getEvents(schoolId, upcomingOnly);
    }

    @PostMapping
    public EventDto createEvent(@RequestBody EventDto request) {
        return eventService.createEvent(request);
    }

    @PutMapping("/{id}")
    public EventDto updateEvent(@PathVariable("id") Long id, @RequestBody EventDto request) {
        return eventService.updateEvent(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteEvent(@PathVariable("id") Long id) {
        eventService.deleteEvent(id);
    }
}
