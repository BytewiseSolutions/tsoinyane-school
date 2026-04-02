package com.tsoinyane.api.subject;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectImportResult {
    private int totalRows;
    private int successfulImports;
    private List<String> errors;
}