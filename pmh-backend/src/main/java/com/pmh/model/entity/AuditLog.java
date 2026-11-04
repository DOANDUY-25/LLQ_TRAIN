package com.pmh.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "PMH_AUDIT_LOG")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "pmh_audit_log_seq_gen")
    @SequenceGenerator(
            name = "pmh_audit_log_seq_gen",
            sequenceName = "PMH_AUDIT_LOG_SEQ",
            allocationSize = 1
    )
    @Column(name = "ID")
    private Long id;

    @Column(name = "MODULE", nullable = false, length = 50)
    private String module;

    @Column(name = "RECORD_ID", nullable = false, length = 100)
    private String recordId;

    @Column(name = "ACTION", nullable = false, length = 100)
    private String action;

    @Column(name = "PERFORMED_BY", nullable = false, length = 100)
    private String performedBy;

    @Column(name = "ACTION_DATE", nullable = false)
    private LocalDateTime actionDate;

    @Lob
    @Column(name = "OLD_DATA")
    private String oldData;

    @Lob
    @Column(name = "NEW_DATA_LOG")
    private String newDataLog;

    @Column(name = "DESCRIPTION", length = 4000)
    private String description;

    @Column(name = "STATUS_BEFORE")
    private Integer statusBefore;

    @Column(name = "STATUS_AFTER")
    private Integer statusAfter;

    @Column(name = "IP_ADDRESS", length = 100)
    private String ipAddress;
}
