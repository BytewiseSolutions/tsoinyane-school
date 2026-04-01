package com.tsoinyane.api.lesson;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LessonRepository extends JpaRepository<Lesson, Long> {

    boolean existsByTeacher_Id(Long teacherId);

    @Query("""
            select l.id from Lesson l
            where l.timetable.id in :timetableIds
            """)
    List<Long> findIdsByTimetableIdIn(@Param("timetableIds") List<Long> timetableIds);

    @Query("""
            select l from Lesson l
            left join fetch l.subject s
            left join fetch l.teacher t
            left join fetch t.user
            left join fetch l.timetable tt
            where (:timetableId is null or tt.id = :timetableId)
            order by l.date asc, l.startTime asc, l.id asc
            """)
    List<Lesson> findAllByTimetableId(@Param("timetableId") Long timetableId);

    @Query("""
            select l from Lesson l
            left join fetch l.subject s
            left join fetch l.teacher t
            left join fetch t.user
            left join fetch l.timetable tt
            left join fetch tt.students
            where l.id = :id
            """)
    Optional<Lesson> findWithAssociationsById(@Param("id") Long id);
}
