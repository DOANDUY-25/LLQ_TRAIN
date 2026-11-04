package com.pmh.repository;

import com.pmh.model.entity.GroupCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupCategoryRepository
        extends JpaRepository<GroupCategory, Long>, JpaSpecificationExecutor<GroupCategory> {

    /**
     * Kiểm tra trùng (paramName + paramType + componentCode) khi tạo mới
     */
    boolean existsByParamNameAndParamTypeAndComponentCode(
            String paramName, String paramType, String componentCode);

    /**
     * Kiểm tra trùng khi sửa (loại trừ bản ghi hiện tại)
     */
    boolean existsByParamNameAndParamTypeAndComponentCodeAndIdNot(
            String paramName, String paramType, String componentCode, Long id);

    /**
     * Danh sách distinct PARAM_TYPE để filter
     */
    @Query("SELECT DISTINCT g.paramType FROM GroupCategory g WHERE g.paramType IS NOT NULL ORDER BY g.paramType")
    List<String> findDistinctParamTypes();

    /**
     * Danh sách distinct COMPONENT_CODE đang dùng trong bảng này
     */
    @Query("SELECT DISTINCT g.componentCode FROM GroupCategory g WHERE g.componentCode IS NOT NULL ORDER BY g.componentCode")
    List<String> findDistinctComponentCodes();
}
