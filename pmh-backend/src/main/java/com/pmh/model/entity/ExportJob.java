package com.pmh.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "EXPORT_JOB")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "export_job_seq")
    @SequenceGenerator(name = "export_job_seq", sequenceName = "EXPORT_JOB_SEQ", allocationSize = 1)
    private Long id;

    @Column(name = "JOB_ID", unique = true, nullable = false)
    private String jobId;                 // UUID

    @Column(name = "USER_ID")
    private String userId;

    @Column(name = "STATUS")              // PENDING, PROCESSING, SUCCESS, FAILED
    private String status;

    @Column(name = "PROGRESS")
    private Integer progress;

    @Column(name = "FILE_URL")
    private String fileUrl;

    @Column(name = "TOTAL_RECORDS")
    private Long totalRecords;

    @Column(name = "ERROR_MESSAGE", length = 1000)
    private String errorMessage;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;

    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "PENDING";
        if (progress == null) progress = 0;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
