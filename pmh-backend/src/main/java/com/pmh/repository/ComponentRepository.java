package com.pmh.repository;

import com.pmh.model.entity.Components;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComponentRepository extends JpaRepository<Components, Long>, JpaSpecificationExecutor<Components> {
    boolean existsByComponentCode(String componentCode);
    boolean existsByComponentCodeAndIdNot(String componentCode, Long id);
    Optional<Components> findByComponentCode(String componentCode);

    @Query("SELECT DISTINCT c.componentCode FROM Components c WHERE c.componentCode IS NOT NULL ORDER BY c.componentCode")
    List<String> findDistinctComponentCodes();

    @Query("SELECT DISTINCT c.componentName FROM Components c WHERE c.componentName IS NOT NULL ORDER BY c.componentName")
    List<String> findDistinctComponentNames();
}

