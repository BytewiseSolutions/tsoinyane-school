package com.tsoinyane.api.fee;

import jakarta.validation.Valid;
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
@RequestMapping("/fee-structure")
@RequiredArgsConstructor
public class FeeStructureController {

    private final FeeStructureService feeStructureService;

    @GetMapping
    public List<FeeStructureDto> getFeeStructures(@RequestParam(value = "schoolId", required = false) Long schoolId) {
        return feeStructureService.getFeeStructures(schoolId);
    }

    @GetMapping("/{id}")
    public FeeStructureDto getFeeStructure(@PathVariable Long id) {
        return feeStructureService.getFeeStructure(id);
    }

    @PostMapping
    public FeeStructureDto createFeeStructure(@Valid @RequestBody FeeStructureDto request) {
        return feeStructureService.createFeeStructure(request);
    }

    @PutMapping("/{id}")
    public FeeStructureDto updateFeeStructure(@PathVariable Long id, @Valid @RequestBody FeeStructureDto request) {
        return feeStructureService.updateFeeStructure(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteFeeStructure(@PathVariable Long id) {
        feeStructureService.deleteFeeStructure(id);
    }
}
