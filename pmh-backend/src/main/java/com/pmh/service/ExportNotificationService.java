package com.pmh.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExportNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void onMessage(String message) {
        try {
            Map<String, Object> event = objectMapper.readValue(message, Map.class);
            String userId = (String) event.get("userId");
            String jobId = (String) event.get("jobId");

            // Đẩy riêng cho user đó
            messagingTemplate.convertAndSendToUser(
                    userId,
                    "/queue/export/" + jobId,
                    event
            );

            // Hoặc broadcast theo topic
            messagingTemplate.convertAndSend("/topic/export/" + jobId, event);

            log.info("Đã push WebSocket cho job {}", jobId);
        } catch (Exception e) {
            log.error("Lỗi parse Redis message", e);
        }
    }
}
