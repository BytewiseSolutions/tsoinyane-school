package com.tsoinyane.api.subject;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SubjectRepository extends JpaRepository<Subject, Long> {

    boolean existsByTeacher_Id(Long teacherId);

    @Modifying
    @Query(value = "delete from subject_student where student_id = :studentId", nativeQuery = true)
    void deleteStudentAssignments(@Param("studentId") Long studentId);

    @Query("""
            select s from Subject s
            join fetch s.school
            join fetch s.grade
            join fetch s.teacher t
            join fetch t.user
            where (:schoolId is null or s.school.id = :schoolId)
            order by s.id asc
            """)
    List<Subject> findAllBySchoolId(@Param("schoolId") Long schoolId);

    @Query("""
            select s from Subject s
            join fetch s.school
            join fetch s.grade
            join fetch s.teacher t
            join fetch t.user
            where s.id = :id
            """)
    Optional<Subject> findWithAssociationsById(@Param("id") Long id);

    @Query("""
            select s from Subject s
            left join fetch s.students st
            left join fetch st.user
            where s.id = :id
            """)
    Optional<Subject> findWithStudentsById(@Param("id") Long id);

    @Query("select count(s) from Subject s where (:schoolId is null or s.school.id = :schoolId)")
    long countBySchoolId(@Param("schoolId") Long schoolId);
}
