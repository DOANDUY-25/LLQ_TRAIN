package com.pmh.service;

import com.pmh.model.entity.AuditLog;
import com.pmh.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final HttpServletRequest request;

    /**
     * Ghi log cho module COMPONENTS
     */
    public void saveLog(Long recordId, String action,
                        Integer statusBefore, Integer statusAfter, String description) {
        saveLog("COMPONENTS", recordId, action, statusBefore, statusAfter, description);
    }

    /**
     * Ghi log với module tuỳ chỉnh
     */
    public void saveLog(String module, Long recordId, String action,
                        Integer statusBefore, Integer statusAfter, String description) {
        AuditLog log = AuditLog.builder()
                .module(module)
                .recordId(String.valueOf(recordId))
                .action(action)
                .statusBefore(statusBefore)
                .statusAfter(statusAfter)
                .description(description)
                .performedBy(getCurrentUser())
                .actionDate(LocalDateTime.now())
                .ipAddress(getClientIp())
                .build();
        auditLogRepository.save(log);
    }


    public Page<AuditLog> getHistory(String recordId, Pageable pageable) {
        return auditLogRepository.findByRecordIdOrderByActionDateDesc(String.valueOf(recordId), pageable);
    }


    private String getClientIp() {
        if (request == null) return "127.0.0.1";
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }

    private String getCurrentUser() {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder
                        .getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            return auth.getName();
        }
        if (request != null && request.getUserPrincipal() != null) {
            return request.getUserPrincipal().getName();
        }
        return "system";
    }
}
