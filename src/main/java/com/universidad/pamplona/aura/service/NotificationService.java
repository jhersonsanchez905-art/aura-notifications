package com.universidad.pamplona.aura.service;

import com.universidad.pamplona.aura.model.Notification;
import com.universidad.pamplona.aura.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repository;
    private final SimpMessagingTemplate messagingTemplate;

    // Guarda y transmite el evento a todos los clientes
    public Notification saveAndBroadcast(Notification notification) {
        Notification saved = repository.save(notification);
        messagingTemplate.convertAndSend("/topic/notifications", saved);
        return saved;
    }

    // Últimas 20 notificaciones para clientes nuevos
    public List<Notification> getLast20() {
        return repository.findTop20ByOrderByTimestampDesc();
    }

    // Todas las notificaciones
    public List<Notification> getAll() {
        return repository.findAll();
    }

    // Filtrar por tipo
    public List<Notification> getByType(String type) {
        return repository.findByType(type);
    }

    // Marcar como leída
    public Notification markAsRead(String id) {
        return repository.findById(id).map(n -> {
            n.setRead(true);
            return repository.save(n);
        }).orElseThrow(() ->
                new RuntimeException("Notificación no encontrada: " + id));
    }
}