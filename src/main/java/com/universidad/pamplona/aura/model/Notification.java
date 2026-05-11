package com.universidad.pamplona.aura.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;

    // Tipo: ENTRADA, ACTIVIDAD, SALIDA, VALOR
    private String type;

    private String title;

    private String description;

    private Instant timestamp;

    @Builder.Default
    private boolean read = false;

    // Prioridad: LOW, MEDIUM, HIGH
    private String priority;

    private String processId;

    private Integer stage;
}