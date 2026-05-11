package com.universidad.pamplona.aura.service;

import com.universidad.pamplona.aura.model.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Random;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventGeneratorService {

    private final NotificationService notificationService;
    private final Random random = new Random();

    // Tipos de evento del proceso
    private static final List<String> TYPES =
            List.of("ENTRADA", "ACTIVIDAD", "SALIDA", "VALOR");

    // Prioridades
    private static final List<String> PRIORITIES =
            List.of("LOW", "MEDIUM", "HIGH");

    // Títulos por tipo (patrón Factory)
    private static final java.util.Map<String, List<String>> TITLES =
            java.util.Map.of(
                    "ENTRADA", List.of(
                            "Nuevo lote IoT recibido",
                            "Datos de sensores industriales entrantes",
                            "Paquete de telemetría recibido",
                            "Registros de campo sincronizados"
                    ),
                    "ACTIVIDAD", List.of(
                            "Procesamiento de datos iniciado",
                            "Validación de registros en curso",
                            "Transformación de datos activa",
                            "Pipeline de análisis ejecutándose"
                    ),
                    "SALIDA", List.of(
                            "Reporte generado exitosamente",
                            "Datos exportados al sistema destino",
                            "Resultados publicados en el bus",
                            "Archivo de salida disponible"
                    ),
                    "VALOR", List.of(
                            "KPI calculado: eficiencia óptima",
                            "Métrica de rendimiento actualizada",
                            "Indicador de calidad procesado",
                            "Dashboard de valor actualizado"
                    )
            );

    // Descripciones por tipo
    private static final java.util.Map<String, List<String>> DESCRIPTIONS =
            java.util.Map.of(
                    "ENTRADA", List.of(
                            "1,240 registros de sensores procesados",
                            "3,580 registros recibidos del nodo Sur",
                            "892 paquetes de telemetría validados",
                            "2,100 registros sincronizados correctamente"
                    ),
                    "ACTIVIDAD", List.of(
                            "Etapa 2 de 4 — validación en curso",
                            "Procesando lote en memoria — 78% completado",
                            "Transformación aplicada a 1,500 registros",
                            "Análisis estadístico iniciado sobre dataset"
                    ),
                    "SALIDA", List.of(
                            "980 registros válidos exportados",
                            "Archivo CSV generado — 2.4 MB",
                            "Resultados enviados a 3 suscriptores",
                            "Reporte PDF disponible para descarga"
                    ),
                    "VALOR", List.of(
                            "Eficiencia del proceso: 98.3%",
                            "Tasa de error reducida al 0.02%",
                            "Throughput: 450 registros/segundo",
                            "Latencia promedio: 12ms — dentro del umbral"
                    )
            );

    // Se ejecuta cada 3 a 8 segundos aleatoriamente
    @Scheduled(fixedDelay = 1000)
    public void generateEvent() throws InterruptedException {
        // Espera aleatoria entre 3000ms y 8000ms
        int delay = 3000 + random.nextInt(5000);
        Thread.sleep(delay);

        String type = TYPES.get(random.nextInt(TYPES.size()));
        int stage = TYPES.indexOf(type) + 1;

        List<String> titles = TITLES.get(type);
        List<String> descriptions = DESCRIPTIONS.get(type);

        Notification notification = Notification.builder()
                .id(UUID.randomUUID().toString())
                .type(type)
                .title(titles.get(random.nextInt(titles.size())))
                .description(descriptions.get(random.nextInt(descriptions.size())))
                .timestamp(Instant.now())
                .read(false)
                .priority(PRIORITIES.get(random.nextInt(PRIORITIES.size())))
                .processId("PROC-00" + (random.nextInt(9) + 1))
                .stage(stage)
                .build();

        log.info("Evento generado: [{}] {} - {}",
                type, notification.getTitle(), notification.getProcessId());

        notificationService.saveAndBroadcast(notification);
    }
}