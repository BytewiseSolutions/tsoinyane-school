package com.tsoinyane.api.grade;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GradeRepository extends JpaRepository<Grade, Long> {

    @Query("select distinct g from Grade g join fetch g.school left join fetch g.createdBy left join fetch g.updatedBy order by g.id asc")
    List<Grade> findAllWithSchoolOrderByIdAsc();

    @Query("select g from Grade g join fetch g.school left join fetch g.createdBy left join fetch g.updatedBy where g.id = :id")
    Optional<Grade> findWithSchoolById(@Param("id") Long id);

    @Query("select count(g) from Grade g where (:schoolId is null or g.school.id = :schoolId)")
    long countBySchoolId(@Param("schoolId") Long schoolId);

    Optional<Grade> findByNameAndSchoolId(String name, Long schoolId);
}
