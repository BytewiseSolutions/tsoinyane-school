package com.tsoinyane.api.common;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class BaseDto {

    private Long id;

    private Instant createdAt;

    private Instant updatedAt;

    private Long createdById;
    private String createdByName;

    private Long updatedById;
    private String updatedByName;

    private Long schoolId;
    private String schoolName;
}