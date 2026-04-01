package com.tsoinyane.api.timetable;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TimetableRepository extends JpaRepository<Timetable, Long> {

    @Modifying
    @Query(value = "delete from timetable_student where student_id = :studentId", nativeQuery = true)
    void deleteStudentAssignments(@Param("studentId") Long studentId);

    @Query("""
            select distinct t from Timetable t
            join fetch t.subject s
            join fetch s.school
            left join fetch t.students
            where (:subjectId is null or s.id = :subjectId)
            order by t.dayOfWeek asc, t.startTime asc, t.id asc
            """)
    List<Timetable> findAllBySubjectId(@Param("subjectId") Long subjectId);

    @Query("""
            select distinct t from Timetable t
            join fetch t.subject s
            join fetch s.school
            left join fetch t.students
            where t.id = :id
            """)
    Optional<Timetable> findWithAssociationsById(@Param("id") Long id);
}
