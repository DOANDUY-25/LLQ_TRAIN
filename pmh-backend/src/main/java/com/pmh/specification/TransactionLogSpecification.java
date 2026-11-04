package com.pmh.specification;

import com.pmh.model.dto.TransactionLogSearchDTO;
import com.pmh.model.entity.TransactionLog;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class TransactionLogSpecification {

    public static Specification<TransactionLog> filterBy(TransactionLogSearchDTO search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Transaction Code
            if (search.getTransactionCode() != null && !search.getTransactionCode().isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("transactionCode")),
                        "%" + search.getTransactionCode().toLowerCase() + "%"));
            }

            // Account No
            if (search.getAccountNo() != null && !search.getAccountNo().isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("accountNo")),
                        "%" + search.getAccountNo().toLowerCase() + "%"));
            }

            // Status
            if (search.getStatus() != null && !search.getStatus().isBlank()) {
                predicates.add(cb.equal(root.get("status"), search.getStatus()));
            }

            // Reference No
            if (search.getReferenceNo() != null && !search.getReferenceNo().isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("referenceNo")),
                        "%" + search.getReferenceNo().toLowerCase() + "%"));
            }

            // Created At From
            if (search.getCreatedAtFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), search.getCreatedAtFrom()));
            }

            // Created At To
            if (search.getCreatedAtTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), search.getCreatedAtTo()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
