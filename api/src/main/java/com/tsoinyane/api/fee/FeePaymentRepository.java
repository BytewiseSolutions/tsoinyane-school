package com.tsoinyane.api.fee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FeePaymentRepository extends JpaRepository<FeePayment, Long> {

    @Query("""
            select payment from FeePayment payment
            join fetch payment.student student
            join fetch student.user
            join fetch student.grade
            join fetch student.school
            join fetch payment.feeStructure feeStructure
            where (:schoolId is null or student.school.id = :schoolId)
            order by payment.paymentDate desc, payment.createdAt desc
            """)
    List<FeePayment> findAllWithAssociations(@Param("schoolId") Long schoolId);

    @Query("""
            select payment from FeePayment payment
            join fetch payment.student student
            join fetch student.user
            join fetch student.grade
            join fetch student.school
            join fetch payment.feeStructure feeStructure
            where payment.id = :id
            """)
    Optional<FeePayment> findWithAssociationsById(@Param("id") Long id);

    @Query("""
            select coalesce(sum(payment.amount), 0) from FeePayment payment
            where payment.student.id = :studentId
              and payment.feeStructure.id = :feeStructureId
              and (payment.reversed is null or payment.reversed = false)
            """)
    Double sumPaidAmount(@Param("studentId") Long studentId, @Param("feeStructureId") Long feeStructureId);

    @Query("""
            select coalesce(sum(payment.amount), 0) from FeePayment payment
            where payment.student.id = :studentId
              and payment.feeStructure.id = :feeStructureId
              and (payment.reversed is null or payment.reversed = false)
              and payment.id <> :paymentId
            """)
    Double sumPaidAmountExcludingPayment(
            @Param("studentId") Long studentId,
            @Param("feeStructureId") Long feeStructureId,
            @Param("paymentId") Long paymentId
    );

    @Query("""
            select coalesce(sum(payment.amount), 0) from FeePayment payment
            join payment.student student
            where student.school.id = :schoolId
              and payment.paymentDate >= :fromDate
              and payment.paymentDate <= :toDate
              and (payment.reversed is null or payment.reversed = false)
            """)
    Double sumCollectedBySchoolAndDateRange(
            @Param("schoolId") Long schoolId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    @Query("""
            select count(payment) from FeePayment payment
            join payment.student student
            where student.school.id = :schoolId
              and payment.paymentDate >= :fromDate
              and payment.paymentDate <= :toDate
              and (payment.reversed is null or payment.reversed = false)
            """)
    Integer countPaymentsBySchoolAndDateRange(
            @Param("schoolId") Long schoolId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    boolean existsByStudentId(Long studentId);
}
