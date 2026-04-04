package com.tsoinyane.api.assessment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {

    @Query("""
            select a from Assessment a
            join fetch a.subjectAssignment sa
            join fetch sa.subject subject
            join fetch subject.school
            join fetch sa.grade
            join fetch a.teacher teacher
            join fetch teacher.user
            where (:schoolId is null or subject.school.id = :schoolId)
            and (:subjectAssignmentId is null or sa.id = :subjectAssignmentId)
            and (:teacherId is null or teacher.id = :teacherId)
            order by case when a.assessmentDate is null then 1 else 0 end, a.assessmentDate desc, a.createdAt desc
            """)
    List<Assessment> findAllByFilters(
            @Param("schoolId") Long schoolId,
            @Param("subjectAssignmentId") Long subjectAssignmentId,
            @Param("teacherId") Long teacherId
    );

    @Query("""
            select a from Assessment a
            join fetch a.subjectAssignment sa
            join fetch sa.subject subject
            join fetch subject.school
            join fetch sa.grade
            left join fetch sa.students
            join fetch a.teacher teacher
            join fetch teacher.user
            where a.id = :id
            """)
    Optional<Assessment> findWithAssociationsById(@Param("id") Long id);
}
