package com.pmh.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pmh.config.RedisPubSubConfig;
import com.pmh.model.dto.ExportJobMessage;
import com.pmh.model.dto.TransactionLogSearchDTO;
import com.pmh.model.entity.TransactionLog;
import com.pmh.repository.ExportJobRepository;
import com.pmh.repository.TransactionLogRepository;
import com.pmh.specification.TransactionLogSpecification;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExportWorker {

    private final ExportJobRepository exportJobRepository;
    private final TransactionLogRepository transactionLogRepository;
    private final StringRedisTemplate redisTemplate;
    private final MinioClient minioClient;
    private final ObjectMapper objectMapper;

    @Value("${minio.bucket}")
    private String bucket;

    private static final int BATCH_SIZE = 5000;

    @KafkaListener(topics = "${app.kafka.export-topic}", groupId = "export-worker-group")
    public void consume(ExportJobMessage message) {
        String jobId = message.getJobId();
        log.info("Worker nhận job: {}", jobId);

        try {
            updateStatus(jobId, "PROCESSING", 0, null);

            // 1. Parse JSON filter từ message (nếu có)
            TransactionLogSearchDTO searchDTO = null;
            if (message.getFilter() != null && !message.getFilter().isBlank()) {
                try {
                    searchDTO = objectMapper.readValue(message.getFilter(), TransactionLogSearchDTO.class);
                    log.info("Job {} áp dụng bộ lọc: {}", jobId, message.getFilter());
                } catch (Exception e) {
                    log.warn("Không thể parse filter JSON từ job {}: {}", jobId, e.getMessage());
                }
            }

            // 2. Tạo Specification từ bộ lọc tìm kiếm
            Specification<TransactionLog> spec = (searchDTO != null)
                    ? TransactionLogSpecification.filterBy(searchDTO)
                    : null;

            // 3. Đếm tổng số record thỏa mãn điều kiện lọc
            long total = (spec != null)
                    ? transactionLogRepository.count(spec)
                    : transactionLogRepository.count();
            updateJobTotal(jobId, total);
            log.info("Job {} tổng số bản ghi cần xuất: {}", jobId, total);

            // 4. Tạo file Excel streaming (SXSSF để tiết kiệm memory)
            try (SXSSFWorkbook workbook = new SXSSFWorkbook(100);
                 ByteArrayOutputStream out = new ByteArrayOutputStream()) {

                Sheet sheet = workbook.createSheet("TransactionLog");
                createHeader(sheet);

                int page = 0;
                int rowNum = 1;
                long processed = 0;

                while (total > 0) {
                    Page<TransactionLog> batchPage = (spec != null)
                            ? transactionLogRepository.findAll(spec, PageRequest.of(page, BATCH_SIZE, Sort.by("id").ascending()))
                            : transactionLogRepository.findAll(PageRequest.of(page, BATCH_SIZE, Sort.by("id").ascending()));

                    List<TransactionLog> batch = batchPage.getContent();
                    if (batch.isEmpty()) break;

                    for (TransactionLog logItem : batch) {
                        Row row = sheet.createRow(rowNum++);
                        writeRow(row, logItem);
                    }

                    processed += batch.size();
                    int progress = (int) ((processed * 100) / total);

                    // Cập nhật progress vào Redis (cực nhanh)
                    redisTemplate.opsForValue().set(
                            "export:progress:" + jobId,
                            String.valueOf(progress),
                            1, TimeUnit.HOURS
                    );

                    // Cập nhật DB thưa hơn (mỗi 10%)
                    if (progress % 10 == 0) {
                        updateStatus(jobId, "PROCESSING", progress, null);
                    }

                    page++;
                }

                // Nếu không có bản ghi nào, vẫn set progress 100%
                if (total == 0) {
                    redisTemplate.opsForValue().set(
                            "export:progress:" + jobId,
                            "100",
                            1, TimeUnit.HOURS
                    );
                }

                workbook.write(out);
                workbook.dispose();

                // 5. Upload lên MinIO
                String objectName = "exports/" + jobId + ".xlsx";
                byte[] bytes = out.toByteArray();

                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(bucket)
                                .object(objectName)
                                .stream(new ByteArrayInputStream(bytes), bytes.length, -1)
                                .contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                                .build()
                );

                String fileUrl = "http://localhost:9000/" + bucket + "/" + objectName;

                // 6. Cập nhật SUCCESS
                updateStatus(jobId, "SUCCESS", 100, fileUrl);

                // 7. Publish event qua Redis Pub/Sub
                String event = String.format(
                        "{\"jobId\":\"%s\",\"userId\":\"%s\",\"status\":\"SUCCESS\",\"fileUrl\":\"%s\",\"progress\":100}",
                        jobId, message.getUserId(), fileUrl
                );
                redisTemplate.convertAndSend(RedisPubSubConfig.EXPORT_CHANNEL, event);

                log.info("Job {} hoàn thành. File: {}", jobId, fileUrl);

            }
        } catch (Exception e) {
            log.error("Job {} lỗi", jobId, e);
            updateStatus(jobId, "FAILED", null, null);
        }
    }

    private void createHeader(Sheet sheet) {
        Row header = sheet.createRow(0);
        String[] columns = {"ID", "Transaction Code", "Account No", "Amount", "Status", "Created At", "Description", "Reference No"};
        for (int i = 0; i < columns.length; i++) {
            header.createCell(i).setCellValue(columns[i]);
        }
    }

    private void writeRow(Row row, TransactionLog t) {
        row.createCell(0).setCellValue(t.getId() != null ? t.getId() : 0);
        row.createCell(1).setCellValue(t.getTransactionCode());
        row.createCell(2).setCellValue(t.getAccountNo());
        row.createCell(3).setCellValue(t.getAmount() != null ? t.getAmount().doubleValue() : 0);
        row.createCell(4).setCellValue(t.getStatus());
        row.createCell(5).setCellValue(t.getCreatedAt() != null ? t.getCreatedAt().toString() : "");
        row.createCell(6).setCellValue(t.getDescription());
        row.createCell(7).setCellValue(t.getReferenceNo());
    }

    @Transactional
    public void updateStatus(String jobId, String status, Integer progress, String fileUrl) {
        exportJobRepository.findByJobId(jobId).ifPresent(job -> {
            job.setStatus(status);
            if (progress != null) job.setProgress(progress);
            if (fileUrl != null) job.setFileUrl(fileUrl);
            exportJobRepository.save(job);
        });
    }

    @Transactional
    public void updateJobTotal(String jobId, long total) {
        exportJobRepository.findByJobId(jobId).ifPresent(job -> {
            job.setTotalRecords(total);
            exportJobRepository.save(job);
        });
    }
}
