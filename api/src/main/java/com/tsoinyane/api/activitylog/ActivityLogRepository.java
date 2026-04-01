package com.tsoinyane.api.activitylog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    @Query("""
            select l from ActivityLog l
            where (:schoolId is null or l.schoolId = :schoolId or l.schoolId is null)
            order by l.createdAt desc, l.id desc
            """)
    List<ActivityLog> findRecent(@Param("schoolId") Long schoolId);
}
