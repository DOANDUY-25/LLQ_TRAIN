package com.pmh.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransactionLogSearchDTO {

    private String transactionCode;
    private String accountNo;
    private String status;
    private LocalDateTime createdAtFrom;
    private LocalDateTime createdAtTo;
    private String referenceNo;
}
