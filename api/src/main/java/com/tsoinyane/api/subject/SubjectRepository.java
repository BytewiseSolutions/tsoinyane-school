package com.tsoinyane.api.subject;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SubjectRepository extends JpaRepository<Subject, Long> {

    @Query("""
            select s from Subject s
            join fetch s.school
            where (:schoolId is null or s.school.id = :schoolId)
            order by s.id asc
            """)
    List<Subject> findAllBySchoolId(@Param("schoolId") Long schoolId);

    @Query("""
            select s from Subject s
            join fetch s.school
            where s.id = :id
            """)
    Optional<Subject> findWithAssociationsById(@Param("id") Long id);

    @Query("select count(s) from Subject s where (:schoolId is null or s.school.id = :schoolId)")
    long countBySchoolId(@Param("schoolId") Long schoolId);

    boolean existsByCodeAndSchoolId(String code, Long schoolId);

    boolean existsByCodeAndSchoolIdAndIdNot(String code, Long schoolId, Long id);
}
