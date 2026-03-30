package com.tsoinyane.api.dashboard;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class DashboardRecentStudentDto {
    Long id;
    String name;
    String school;
    String grade;
    String status;
}
