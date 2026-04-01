package com.tsoinyane.api.activitylog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    @Query(
            value = """
            select l from ActivityLog l
            where (:schoolId is null or l.schoolId = :schoolId or l.schoolId is null)
              and (
                    :query is null
                    or lower(coalesce(l.actorName, '')) like concat('%', lower(:query), '%')
                    or lower(coalesce(l.actorEmail, '')) like concat('%', lower(:query), '%')
                    or lower(coalesce(l.description, '')) like concat('%', lower(:query), '%')
                    or lower(coalesce(l.module, '')) like concat('%', lower(:query), '%')
                    or lower(coalesce(l.action, '')) like concat('%', lower(:query), '%')
                    or lower(coalesce(l.schoolName, '')) like concat('%', lower(:query), '%')
                    or lower(coalesce(l.endpoint, '')) like concat('%', lower(:query), '%')
              )
              and (:action is null or l.action = :action)
              and (:module is null or l.module = :module)
              and (:success is null or l.success = :success)
            """,
            countQuery = """
            select count(l) from ActivityLog l
            where (:schoolId is null or l.schoolId = :schoolId or l.schoolId is null)
              and (
                    :query is null
                    or lower(coalesce(l.actorName, '')) like concat('%', lower(:query), '%')
                    or lower(coalesce(l.actorEmail, '')) like concat('%', lower(:query), '%')
                    or lower(coalesce(l.description, '')) like concat('%', lower(:query), '%')
                    or lower(coalesce(l.module, '')) like concat('%', lower(:query), '%')
                    or lower(coalesce(l.action, '')) like concat('%', lower(:query), '%')
                    or lower(coalesce(l.schoolName, '')) like concat('%', lower(:query), '%')
                    or lower(coalesce(l.endpoint, '')) like concat('%', lower(:query), '%')
              )
              and (:action is null or l.action = :action)
              and (:module is null or l.module = :module)
              and (:success is null or l.success = :success)
            """
    )
    Page<ActivityLog> findPage(
            @Param("schoolId") Long schoolId,
            @Param("query") String query,
            @Param("action") String action,
            @Param("module") String module,
            @Param("success") Boolean success,
            Pageable pageable
    );

    @Query("""
            select distinct l.action from ActivityLog l
            where (:schoolId is null or l.schoolId = :schoolId or l.schoolId is null)
            order by l.action asc
            """)
    List<String> findActionOptions(@Param("schoolId") Long schoolId);

    @Query("""
            select distinct l.module from ActivityLog l
            where (:schoolId is null or l.schoolId = :schoolId or l.schoolId is null)
            order by l.module asc
            """)
    List<String> findModuleOptions(@Param("schoolId") Long schoolId);
}
