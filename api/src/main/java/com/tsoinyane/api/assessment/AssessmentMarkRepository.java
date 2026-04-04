package com.tsoinyane.api.assessment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AssessmentMarkRepository extends JpaRepository<AssessmentMark, Long> {

    @Query("""
            select am from AssessmentMark am
            join fetch am.assessment a
            join fetch am.student s
            join fetch s.user
            join fetch s.school
            left join fetch s.grade
            where a.id = :assessmentId
            order by case when s.studentNumber is null then 1 else 0 end, s.studentNumber asc, s.id asc
            """)
    List<AssessmentMark> findAllByAssessmentId(@Param("assessmentId") Long assessmentId);

    @Query("""
            select am from AssessmentMark am
            join fetch am.assessment a
            join fetch am.student s
            join fetch s.user
            join fetch s.school
            left join fetch s.grade
            where a.id = :assessmentId and s.id = :studentId
            """)
    Optional<AssessmentMark> findByAssessmentIdAndStudentId(
            @Param("assessmentId") Long assessmentId,
            @Param("studentId") Long studentId
    );

    @Modifying
    @Query("delete from AssessmentMark am where am.assessment.id = :assessmentId")
    void deleteAllByAssessmentId(@Param("assessmentId") Long assessmentId);
}
