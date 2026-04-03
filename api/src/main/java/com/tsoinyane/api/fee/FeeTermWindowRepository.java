package com.tsoinyane.api.fee;

import com.tsoinyane.api.school.Term;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FeeTermWindowRepository extends JpaRepository<FeeTermWindow, Long> {

    Optional<FeeTermWindow> findBySchoolIdAndTermAndAcademicYear(Long schoolId, Term term, String academicYear);

    @Query("""
            select window from FeeTermWindow window
            join fetch window.school school
            where (:schoolId is null or school.id = :schoolId)
            """)
    List<FeeTermWindow> findAllWithSchool(@Param("schoolId") Long schoolId);
}
