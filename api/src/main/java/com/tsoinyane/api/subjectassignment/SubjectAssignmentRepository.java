package com.tsoinyane.api.subjectassignment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SubjectAssignmentRepository extends JpaRepository<SubjectAssignment, Long> {

    @Query("""
            select distinct sa from SubjectAssignment sa
            join fetch sa.subject subject
            join fetch subject.school
            join fetch sa.grade
            join fetch sa.teacher teacher
            join fetch teacher.user
            where (:schoolId is null or subject.school.id = :schoolId)
            order by sa.id asc
            """)
    List<SubjectAssignment> findAllBySchoolId(@Param("schoolId") Long schoolId);

    @Query("""
            select sa from SubjectAssignment sa
            join fetch sa.subject subject
            join fetch subject.school
            join fetch sa.grade
            join fetch sa.teacher teacher
            join fetch teacher.user
            where sa.id = :id
            """)
    Optional<SubjectAssignment> findWithAssociationsById(@Param("id") Long id);

    @Query("""
            select distinct sa from SubjectAssignment sa
            join fetch sa.subject subject
            join fetch subject.school
            join fetch sa.grade
            join fetch sa.teacher teacher
            join fetch teacher.user
            left join fetch sa.students students
            where sa.id = :id
            """)
    Optional<SubjectAssignment> findWithStudentsById(@Param("id") Long id);

    @Query("""
            select distinct sa from SubjectAssignment sa
            join fetch sa.subject subject
            join fetch subject.school
            join fetch sa.grade
            join fetch sa.teacher teacher
            join fetch teacher.user
            left join fetch sa.students students
            where sa.subject.id = :subjectId
            order by sa.id asc
            """)
    List<SubjectAssignment> findAllBySubjectId(@Param("subjectId") Long subjectId);

    @Modifying
    @Query("delete from SubjectAssignment sa where sa.subject.id = :subjectId")
    void deleteAllBySubjectId(@Param("subjectId") Long subjectId);

    @Modifying
    @Query(value = "delete from subject_student where student_id = :studentId", nativeQuery = true)
    void deleteStudentAssignments(@Param("studentId") Long studentId);

    boolean existsByTeacher_Id(Long teacherId);

    boolean existsBySubject_IdAndGrade_Id(Long subjectId, Long gradeId);

    boolean existsBySubject_IdAndGrade_IdAndIdNot(Long subjectId, Long gradeId, Long id);
}
