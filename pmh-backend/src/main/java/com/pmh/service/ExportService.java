package com.pmh.service;


import com.pmh.model.dto.ExportJobMessage;
import com.pmh.model.entity.ExportJob;
import com.pmh.repository.ExportJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExportService {

    private final ExportJobRepository exportJobRepository;
    private final KafkaTemplate<String, ExportJobMessage> kafkaTemplate;

    @Value("${app.kafka.export-topic}")
    private String exportTopic;

    @Transactional
    public String createExportJob(String userId, String filter) {
        String jobId = UUID.randomUUID().toString();

        ExportJob job = ExportJob.builder()
                .jobId(jobId)
                .userId(userId)
                .status("PENDING")
                .progress(0)
                .build();

        exportJobRepository.save(job);

        // Gửi message vào Kafka
        ExportJobMessage message = ExportJobMessage.builder()
                .jobId(jobId)
                .userId(userId)
                .filter(filter)
                .build();

        kafkaTemplate.send(exportTopic, jobId, message);

        return jobId;
    }
}
