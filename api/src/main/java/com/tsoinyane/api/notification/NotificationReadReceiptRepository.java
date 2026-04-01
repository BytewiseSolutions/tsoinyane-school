package com.tsoinyane.api.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NotificationReadReceiptRepository extends JpaRepository<NotificationReadReceipt, Long> {

    List<NotificationReadReceipt> findAllByUser_IdAndNotification_IdIn(Long userId, Collection<Long> notificationIds);

    Optional<NotificationReadReceipt> findByNotification_IdAndUser_Id(Long notificationId, Long userId);

    void deleteAllByNotification_Id(Long notificationId);
}
