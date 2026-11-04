package com.pmh.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pmh.model.dto.TransactionLogSearchDTO;
import com.pmh.model.entity.ApiResponse;
import com.pmh.model.entity.ExportJob;
import com.pmh.model.entity.TransactionLog;
import com.pmh.repository.ExportJobRepository;
import com.pmh.service.ExportService;
import com.pmh.service.TransactionLogService;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/transaction-logs")
@RequiredArgsConstructor
public class TransactionLogController {

    private final TransactionLogService transactionLogService;
    private final ExportService exportService;
    private final ExportJobRepository exportJobRepository;
    private final StringRedisTemplate redisTemplate;
    private final MinioClient minioClient;
    private final ObjectMapper objectMapper;

    @Value("${minio.bucket}")
    private String bucket;

    /**
     * Tìm kiếm transaction logs
     */
    @PostMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAKER', 'CHECKER', 'VIEWER')")
    public ResponseEntity<ApiResponse<Page<TransactionLog>>> search(
            @RequestBody(required = false) TransactionLogSearchDTO searchDTO,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        if (searchDTO == null) {
            searchDTO = new TransactionLogSearchDTO();
        }

        Sort sort = sortDir.equalsIgnoreCase("ASC")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<TransactionLog> result = transactionLogService.search(searchDTO, pageable);

        return ResponseEntity.ok(ApiResponse.<Page<TransactionLog>>builder()
                .success(true)
                .message("Tìm kiếm thành công")
                .data(result)
                .build());
    }

    /**
     * Khởi tạo export job
     */
    @PostMapping("/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAKER', 'CHECKER')")
    public ResponseEntity<?> exportTransactionLog(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String filter,
            @RequestBody(required = false) TransactionLogSearchDTO filterDTO,
            Authentication authentication) {

        // Xác định userId từ authentication nếu không có param
        String finalUserId = userId;
        if (finalUserId == null || finalUserId.isBlank()) {
            if (authentication != null && authentication.getName() != null && !authentication.getName().isBlank()) {
                finalUserId = authentication.getName();
            } else {
                finalUserId = "userA";
            }
        }

        // Chuyển filterDTO thành json string nếu filter param không có
        String finalFilter = filter;
        if ((finalFilter == null || finalFilter.isBlank()) && filterDTO != null) {
            try {
                finalFilter = objectMapper.writeValueAsString(filterDTO);
            } catch (Exception e) {
                log.warn("Không thể parse filterDTO sang JSON: {}", e.getMessage());
            }
        }

        String jobId = exportService.createExportJob(finalUserId, finalFilter);

        Map<String, Object> data = new HashMap<>();
        data.put("jobId", jobId);
        data.put("status", "PENDING");
        data.put("userId", finalUserId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("jobId", jobId);
        response.put("message", "Export job đã được tiếp nhận. Đang tiến hành xuất file...");
        response.put("data", data);

        return ResponseEntity.ok(response);
    }

    /**
     * Lấy trạng thái và tiến độ của export job
     */
    @GetMapping("/export/status/{jobId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAKER', 'CHECKER', 'VIEWER')")
    public ResponseEntity<?> getExportStatus(@PathVariable String jobId) {
        return exportJobRepository.findByJobId(jobId)
                .map(job -> {
                    // Đọc tiến độ thời gian thực từ Redis nếu có
                    String redisProgress = null;
                    try {
                        redisProgress = redisTemplate.opsForValue().get("export:progress:" + jobId);
                    } catch (Exception e) {
                        log.warn("Lỗi đọc progress từ Redis cho job {}: {}", jobId, e.getMessage());
                    }

                    int progress = job.getProgress() != null ? job.getProgress() : 0;
                    if (redisProgress != null) {
                        try {
                            progress = Math.max(progress, Integer.parseInt(redisProgress));
                        } catch (NumberFormatException ignored) {
                        }
                    }
                    if ("SUCCESS".equalsIgnoreCase(job.getStatus())) {
                        progress = 100;
                    }

                    Map<String, Object> data = new HashMap<>();
                    data.put("jobId", job.getJobId());
                    data.put("userId", job.getUserId());
                    data.put("status", job.getStatus());
                    data.put("progress", progress);
                    data.put("fileUrl", job.getFileUrl());
                    data.put("totalRecords", job.getTotalRecords());
                    data.put("errorMessage", job.getErrorMessage());

                    Map<String, Object> resp = new HashMap<>();
                    resp.put("success", true);
                    resp.put("data", data);
                    return ResponseEntity.ok(resp);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "success", false,
                        "message", "Không tìm thấy export job: " + jobId
                )));
    }

    /**
     * Tải file đã xuất từ MinIO
     */
    @GetMapping("/export/download/{jobId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAKER', 'CHECKER', 'VIEWER')")
    public ResponseEntity<?> downloadExportedFile(@PathVariable String jobId) {
        Optional<ExportJob> jobOpt = exportJobRepository.findByJobId(jobId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "message", "Không tìm thấy export job: " + jobId
            ));
        }

        ExportJob job = jobOpt.get();
        if (!"SUCCESS".equalsIgnoreCase(job.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "File chưa sẵn sàng để tải xuống. Trạng thái: " + job.getStatus()
            ));
        }

        String objectName = "exports/" + jobId + ".xlsx";
        try {
            InputStream stream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .build()
            );

            String filename = "transaction_logs_" + jobId.substring(0, Math.min(jobId.length(), 8)) + ".xlsx";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new InputStreamResource(stream));
        } catch (Exception e) {
            log.error("Lỗi khi tải file từ MinIO cho job {}: {}", jobId, e.getMessage());
            if (job.getFileUrl() != null) {
                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(job.getFileUrl()))
                        .build();
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Lỗi tải file: " + e.getMessage()
            ));
        }
    }
}
