package com.pmh.repository;


import com.pmh.model.entity.ExportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ExportJobRepository extends JpaRepository<ExportJob, Long> {
    Optional<ExportJob> findByJobId(String jobId);

}
