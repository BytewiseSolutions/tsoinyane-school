package com.tsoinyane.api.student;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByStudentNumber(String studentNumber);

    @Query("select s from Student s join fetch s.grade join fetch s.school join fetch s.user where s.user.id = :userId")
    Optional<Student> findByUser_Id(@Param("userId") Long userId);

    @Query("select count(s) from Student s where (:schoolId is null or s.school.id = :schoolId)")
    long countBySchoolId(@Param("schoolId") Long schoolId);

    @Query("""
            select s from Student s
            join fetch s.user
            join fetch s.school
            join fetch s.grade
            where (:schoolId is null or s.school.id = :schoolId)
            order by s.createdAt desc
            """)
    List<Student> findRecentForDashboard(@Param("schoolId") Long schoolId, Pageable pageable);

    @Query("""
            select s from Student s
            join fetch s.user
            join fetch s.school
            join fetch s.grade
            where (:schoolId is null or s.school.id = :schoolId)
            order by s.studentNumber asc
            """)
    List<Student> findAllBySchoolId(@Param("schoolId") Long schoolId);
}
