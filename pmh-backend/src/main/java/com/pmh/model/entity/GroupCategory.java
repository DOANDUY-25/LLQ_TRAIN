package com.pmh.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "PMH_GROUP_CATEGORY")
public class GroupCategory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "pmh_group_category_seq_gen")
    @SequenceGenerator(
            name = "pmh_group_category_seq_gen",
            sequenceName = "PMH_GROUP_CATEGORY_SEQ",
            allocationSize = 1
    )
    @Column(name = "ID")
    private Long id;

    /**
     * Tên thành phần — PARAM_NAME
     */
    @Column(name = "PARAM_NAME", nullable = false, length = 255)
    private String paramName;

    /**
     * Giá trị thành phần — PARAM_VALUE
     */
    @Column(name = "PARAM_VALUE", nullable = false, length = 255)
    private String paramValue;

    /**
     * Danh mục theo nhóm — PARAM_TYPE
     */
    @Column(name = "PARAM_TYPE", nullable = false, length = 255)
    private String paramType;

    /**
     * Mô tả
     */
    @Column(name = "DESCRIPTION", length = 4000)
    private String description;

    /**
     * Cấu phần xử lý — tham chiếu COMPONENT_CODE
     */
    @Column(name = "COMPONENT_CODE", nullable = false, length = 255)
    private String componentCode;

    /**
     * Ngày hiệu lực
     */
    @Column(name = "EFFECTIVE_DATE", nullable = false)
    private LocalDateTime effectiveDate;

    /**
     * Ngày hết hiệu lực
     */
    @Column(name = "END_EFFECTIVE_DATE")
    private LocalDateTime endEffectiveDate;

    /**
     * Dữ liệu mới (JSON) — lưu khi sửa ở trạng thái REJECTED/CANCELLED,
     * chờ Checker duyệt mới merge vào các cột chính.
     */
    @Column(name = "NEW_DATA", length = 4000)
    private String newData;
}
