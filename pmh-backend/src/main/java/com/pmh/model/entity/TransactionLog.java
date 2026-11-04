package com.pmh.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "TRANSACTION_LOG")
public class TransactionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "transaction_log_seq_gen")
    @SequenceGenerator(name = "transaction_log_seq_gen", sequenceName = "TRANSACTION_LOG_SEQ", allocationSize = 1)
    @Column(name = "ID")
    private Long id;

    @Column(name = "TRANSACTION_CODE", length = 255)
    private String transactionCode;

    @Column(name = "ACCOUNT_NO", length = 255)
    private String accountNo;

    @Column(name = "AMOUNT", precision = 38, scale = 2)
    private BigDecimal amount;

    @Column(name = "STATUS", length = 255)
    private String status;

    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "DESCRIPTION", length = 255)
    private String description;

    @Column(name = "REFERENCE_NO", length = 255)
    private String referenceNo;

    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
