package com.tsoinyane.api.fee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InstallmentPlanRepository extends JpaRepository<InstallmentPlan, Long> {

    @Query("""
            select plan from InstallmentPlan plan
            join fetch plan.student student
            join fetch student.user
            join fetch student.grade
            join fetch student.school
            join fetch plan.feeStructure feeStructure
            left join fetch plan.installments installments
            where student.school.id = :schoolId
            order by plan.createdAt desc
            """)
    List<InstallmentPlan> findAllWithAssociationsBySchoolId(@Param("schoolId") Long schoolId);

    @Query("""
            select plan from InstallmentPlan plan
            join fetch plan.student student
            join fetch student.user
            join fetch student.grade
            join fetch student.school
            join fetch plan.feeStructure feeStructure
            left join fetch plan.installments installments
            where plan.id = :id
            """)
    Optional<InstallmentPlan> findWithAssociationsById(@Param("id") Long id);

    List<InstallmentPlan> findByStudent_IdAndFeeStructure_IdAndStatus(
            Long studentId,
            Long feeStructureId,
            InstallmentPlanStatus status
    );
}
