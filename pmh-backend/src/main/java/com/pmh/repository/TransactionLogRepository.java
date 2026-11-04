package com.pmh.repository;

import com.pmh.model.entity.TransactionLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionLogRepository extends JpaRepository<TransactionLog, Long>, JpaSpecificationExecutor<TransactionLog> {
    @Query("SELECT t FROM TransactionLog t ORDER BY t.id")
    List<TransactionLog> findAllByOrderById(Pageable pageable);
}
