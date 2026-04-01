package com.tsoinyane.api.notification;

import com.tsoinyane.api.common.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("""
            select distinct n from Notification n
            left join fetch n.createdBy
            join n.audienceRoles audienceRole
            where audienceRole in :roles
            order by n.createdAt desc, n.id desc
            """)
    List<Notification> findVisibleToRoles(@Param("roles") Collection<Role> roles);

    @Query("""
            select n from Notification n
            left join fetch n.createdBy
            where n.createdBy.id = :createdById
            order by n.createdAt desc, n.id desc
            """)
    List<Notification> findAllByCreatedById(@Param("createdById") Long createdById);

    @Query("""
            select n from Notification n
            left join fetch n.createdBy
            where n.id = :id
            """)
    java.util.Optional<Notification> findWithCreatedByById(@Param("id") Long id);
}
