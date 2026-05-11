package com.universidad.pamplona.aura.repository;

import com.universidad.pamplona.aura.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository
        extends MongoRepository<Notification, String> {

    // Buscar por tipo de evento
    List<Notification> findByType(String type);

    // Buscar no leídas
    List<Notification> findByReadFalse();

    // Últimas N notificaciones ordenadas por timestamp
    List<Notification> findTop20ByOrderByTimestampDesc();
}