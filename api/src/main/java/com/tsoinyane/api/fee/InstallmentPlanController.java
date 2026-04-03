package com.tsoinyane.api.fee;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/installment-plan")
@RequiredArgsConstructor
public class InstallmentPlanController {

    private final InstallmentPlanService installmentPlanService;

    @GetMapping
    public List<InstallmentPlanDto> getInstallmentPlans(@RequestParam(value = "schoolId", required = false) Long schoolId) {
        return installmentPlanService.getInstallmentPlans(schoolId);
    }

    @GetMapping("/{id}")
    public InstallmentPlanDto getInstallmentPlan(@PathVariable Long id) {
        return installmentPlanService.getInstallmentPlan(id);
    }

    @PostMapping
    public InstallmentPlanDto createInstallmentPlan(@Valid @RequestBody InstallmentPlanDto request) {
        return installmentPlanService.createInstallmentPlan(request);
    }

    @PutMapping("/{id}")
    public InstallmentPlanDto updateInstallmentPlan(@PathVariable Long id, @Valid @RequestBody InstallmentPlanDto request) {
        return installmentPlanService.updateInstallmentPlan(id, request);
    }

    @PostMapping("/{id}/cancel")
    public InstallmentPlanDto cancelInstallmentPlan(@PathVariable Long id) {
        return installmentPlanService.cancelInstallmentPlan(id);
    }

    @PostMapping("/{id}/payment")
    public InstallmentPlanDto recordInstallmentPayment(
            @PathVariable Long id,
            @Valid @RequestBody InstallmentPaymentRequest paymentData
    ) {
        return installmentPlanService.recordInstallmentPayment(id, paymentData);
    }

    @DeleteMapping("/{id}")
    public void deleteInstallmentPlan(@PathVariable Long id) {
        installmentPlanService.deleteInstallmentPlan(id);
    }
}
