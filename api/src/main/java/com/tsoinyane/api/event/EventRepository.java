package com.tsoinyane.api.event;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Long> {

    @Query("""
            select e from Event e
            join fetch e.school
            left join fetch e.createdBy
            left join fetch e.updatedBy
            where (:schoolId is null or e.school.id = :schoolId)
            order by e.date asc, e.id asc
            """)
    List<Event> findAllBySchoolIdOrderByDateAsc(@Param("schoolId") Long schoolId);

    @Query("""
            select e from Event e
            join fetch e.school
            left join fetch e.createdBy
            left join fetch e.updatedBy
            where (:schoolId is null or e.school.id = :schoolId)
              and (upper(e.status) = 'UPCOMING' or e.date >= :today)
            order by e.date asc, e.id asc
            """)
    List<Event> findUpcomingBySchoolId(@Param("schoolId") Long schoolId, @Param("today") LocalDate today);

    @Query("""
            select e from Event e
            join fetch e.school
            left join fetch e.createdBy
            left join fetch e.updatedBy
            where e.id = :id
            """)
    Optional<Event> findWithSchoolById(@Param("id") Long id);
}
