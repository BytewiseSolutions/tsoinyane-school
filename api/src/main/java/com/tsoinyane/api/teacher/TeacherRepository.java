package com.tsoinyane.api.teacher;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeacherRepository extends JpaRepository<Teacher, Long> {

    @Query("select distinct t from Teacher t left join fetch t.user left join fetch t.school left join fetch t.grades where t.user.id = :userId")
    Optional<Teacher> findByUser_Id(@Param("userId") Long userId);

    @Query("select count(t) from Teacher t where (:schoolId is null or t.school.id = :schoolId)")
    long countBySchoolId(@Param("schoolId") Long schoolId);

    @Query("""
            select distinct t from Teacher t
            join fetch t.user
            join fetch t.school
            where (:schoolId is null or t.school.id = :schoolId)
            order by t.createdAt desc
            """)
    List<Teacher> findRecentForNotifications(@Param("schoolId") Long schoolId, Pageable pageable);

    @Query("""
            select distinct t from Teacher t
            join fetch t.user
            join fetch t.school
            left join fetch t.grades
            where (:schoolId is null or t.school.id = :schoolId)
            order by t.id asc
            """)
    List<Teacher> findAllBySchoolId(@Param("schoolId") Long schoolId);
}
