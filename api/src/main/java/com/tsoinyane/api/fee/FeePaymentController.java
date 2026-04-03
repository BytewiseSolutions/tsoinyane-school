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
import java.util.Map;

@RestController
@RequestMapping("/fee-payment")
@RequiredArgsConstructor
public class FeePaymentController {

    private final FeePaymentService feePaymentService;

    @GetMapping("/outstanding")
    public OutstandingSummaryDto getOutstandingSummary(@RequestParam(value = "schoolId", required = false) Long schoolId) {
        return feePaymentService.getOutstandingSummary(schoolId);
    }

    @GetMapping
    public List<FeePaymentDto> getFeePayments(@RequestParam(value = "schoolId", required = false) Long schoolId) {
        return feePaymentService.getFeePayments(schoolId);
    }

    @GetMapping("/{id}")
    public FeePaymentDto getFeePayment(@PathVariable Long id) {
        return feePaymentService.getFeePayment(id);
    }

    @GetMapping("/{id}/student-summary")
    public StudentPaymentSummaryDto getStudentPaymentSummary(@PathVariable Long id) {
        return feePaymentService.getStudentPaymentSummary(id);
    }

    @PostMapping
    public FeePaymentDto createFeePayment(@Valid @RequestBody FeePaymentDto request) {
        return feePaymentService.createFeePayment(request);
    }

    @PutMapping("/{id}")
    public FeePaymentDto updateFeePayment(@PathVariable Long id, @Valid @RequestBody FeePaymentDto request) {
        return feePaymentService.updateFeePayment(id, request);
    }

    @PostMapping("/{id}/reverse")
    public FeePaymentDto reverseFeePayment(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return feePaymentService.reversePayment(id, body.get("reason"));
    }

    @DeleteMapping("/{id}")
    public void deleteFeePayment(@PathVariable Long id) {
        feePaymentService.deleteFeePayment(id);
    }
}
