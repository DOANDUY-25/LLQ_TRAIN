package com.pmh.service;

import com.pmh.model.dto.TransactionLogSearchDTO;
import com.pmh.model.entity.TransactionLog;
import com.pmh.repository.TransactionLogRepository;
import com.pmh.specification.TransactionLogSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TransactionLogService {

    private final TransactionLogRepository transactionLogRepository;

    /**
     * Tìm kiếm transaction logs với phân trang
     */
    public Page<TransactionLog> search(TransactionLogSearchDTO searchDTO, Pageable pageable) {
        Specification<TransactionLog> spec = TransactionLogSpecification.filterBy(searchDTO);
        return transactionLogRepository.findAll(spec, pageable);
    }

    /**
     * Xuất file - Logic sẽ được implement sau
     */
    public String exportToFile(TransactionLogSearchDTO searchDTO) {
        // TODO: Implement export logic
        return "Dịch vụ chưa có sẵn";
    }
}
