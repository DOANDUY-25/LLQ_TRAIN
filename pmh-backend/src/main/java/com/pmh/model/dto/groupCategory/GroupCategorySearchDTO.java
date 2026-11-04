package com.pmh.model.dto.groupCategory;

import lombok.Data;

import java.util.List;

@Data
public class GroupCategorySearchDTO {

    /**
     * Tìm kiếm theo PARAM_TYPE (danh mục theo nhóm)
     */
    private String paramType;

    /**
     * Tìm kiếm theo PARAM_VALUE
     */
    private String paramValue;

    /**
     * Tìm kiếm theo PARAM_NAME
     */
    private String paramName;

    /**
     * Lọc theo trạng thái tham số (multi-select)
     */
    private List<Integer> statuses;

    /**
     * Lọc theo trạng thái hoạt động (multi-select): 0/1
     */
    private List<Integer> isActives;

    /**
     * Phân trang
     */
    private Integer page;
    private Integer size;
}
