package com.tsoinyane.api.fee;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OutstandingSummaryDto {
    private List<OutstandingLearnerDto> learners;
    private List<GradeOutstandingSummaryDto> gradeSummary;
}
