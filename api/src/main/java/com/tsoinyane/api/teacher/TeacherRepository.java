package com.tsoinyane.api.teacher;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TeacherRepository extends JpaRepository<Teacher, Long> {

    @Query("select distinct t from Teacher t left join fetch t.user left join fetch t.school left join fetch t.grades where t.user.id = :userId")
    Optional<Teacher> findByUser_Id(@Param("userId") Long userId);
}
