package com.pmh.specification;

import com.pmh.model.entity.GroupCategory;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class GroupCategorySpecs {

    /**
     * Tìm kiếm PARAM_TYPE (LIKE, không phân biệt hoa/thường)
     */
    public static Specification<GroupCategory> hasParamType(String paramType) {
        return (root, query, cb) ->
                cb.like(cb.upper(root.get("paramType")), "%" + paramType.toUpperCase() + "%");
    }

    /**
     * Tìm kiếm PARAM_VALUE (LIKE)
     */
    public static Specification<GroupCategory> hasParamValue(String paramValue) {
        return (root, query, cb) ->
                cb.like(cb.upper(root.get("paramValue")), "%" + paramValue.toUpperCase() + "%");
    }

    /**
     * Tìm kiếm PARAM_NAME (LIKE)
     */
    public static Specification<GroupCategory> hasParamName(String paramName) {
        return (root, query, cb) ->
                cb.like(cb.upper(root.get("paramName")), "%" + paramName.toUpperCase() + "%");
    }

    /**
     * Lọc theo danh sách trạng thái (IN)
     */
    public static Specification<GroupCategory> hasStatus(List<Integer> statuses) {
        return (root, query, cb) -> root.get("status").in(statuses);
    }

    /**
     * Lọc theo IS_ACTIVE
     */
    public static Specification<GroupCategory> hasIsActive(List<Integer> isActives) {
        return (root, query, cb) -> root.get("isActive").in(isActives);
    }
}
