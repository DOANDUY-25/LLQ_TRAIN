package com.pmh.model.dto.groupCategory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GroupCategoryRequestDTO {

    @NotBlank(message = "Tên thành phần không được để trống")
    @Size(max = 255, message = "Tên thành phần tối đa 255 ký tự")
    private String paramName;

    @NotBlank(message = "Giá trị thành phần không được để trống")
    @Size(max = 255, message = "Giá trị thành phần tối đa 255 ký tự")
    private String paramValue;

    @NotBlank(message = "Danh mục theo nhóm không được để trống")
    @Size(max = 255, message = "Danh mục theo nhóm tối đa 255 ký tự")
    private String paramType;

    @Size(max = 4000, message = "Mô tả tối đa 4000 ký tự")
    private String description;

    @NotBlank(message = "Cấu phần xử lý không được để trống")
    @Size(max = 255, message = "Mã cấu phần tối đa 255 ký tự")
    private String componentCode;

    @NotNull(message = "Ngày hiệu lực không được để trống")
    private LocalDateTime effectiveDate;

    private LocalDateTime endEffectiveDate;
}
