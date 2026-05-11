package com.universidad.pamplona.aura.controller;

import com.universidad.pamplona.aura.model.Notification;
import com.universidad.pamplona.aura.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // GET todas las notificaciones
    @GetMapping
    public ResponseEntity<List<Notification>> getAll() {
        return ResponseEntity.ok(notificationService.getAll());
    }

    // GET últimas 20
    @GetMapping("/latest")
    public ResponseEntity<List<Notification>> getLatest() {
        return ResponseEntity.ok(notificationService.getLast20());
    }

    // GET por tipo
    @GetMapping("/type/{type}")
    public ResponseEntity<List<Notification>> getByType(
            @PathVariable String type) {
        return ResponseEntity.ok(
                notificationService.getByType(type.toUpperCase()));
    }

    // PUT marcar como leída
    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(
            @PathVariable String id) {
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }
}