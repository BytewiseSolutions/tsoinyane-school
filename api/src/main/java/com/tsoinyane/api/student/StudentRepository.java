package com.tsoinyane.api.student;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByStudentNumber(String studentNumber);

    @Query("select s from Student s join fetch s.grade where s.user.id = :userId")
    Optional<Student> findByUser_Id(@Param("userId") Long userId);
}
