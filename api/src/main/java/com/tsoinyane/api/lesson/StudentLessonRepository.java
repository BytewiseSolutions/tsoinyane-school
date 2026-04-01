package com.tsoinyane.api.lesson;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudentLessonRepository extends JpaRepository<StudentLesson, Long> {

    @Modifying
    @Query("delete from StudentLesson sl where sl.lesson.id in :lessonIds")
    void deleteAllByLessonIdIn(@Param("lessonIds") List<Long> lessonIds);

    @Query("""
            select sl from StudentLesson sl
            join fetch sl.lesson l
            left join fetch l.timetable tt
            left join fetch l.subject s
            join fetch sl.student st
            join fetch st.user
            where (:lessonId is null or l.id = :lessonId)
            order by sl.id asc
            """)
    List<StudentLesson> findAllByLessonId(@Param("lessonId") Long lessonId);

    @Query("""
            select sl from StudentLesson sl
            join fetch sl.lesson l
            left join fetch l.timetable tt
            left join fetch l.subject s
            join fetch sl.student st
            join fetch st.user
            where sl.id = :id
            """)
    Optional<StudentLesson> findWithAssociationsById(@Param("id") Long id);

    boolean existsByLesson_IdAndStudent_Id(Long lessonId, Long studentId);
}
