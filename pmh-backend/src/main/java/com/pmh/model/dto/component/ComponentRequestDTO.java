package com.pmh.model.dto.component;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComponentRequestDTO {

    @NotBlank(message = "Mã cấu phần không được để trống")
    @Size(max = 20, message = "Mã cấu phần không được vượt quá 20 ký tự")
    @Pattern(regexp = "^[A-Z0-9_]+$", message = "Mã cấu phần chỉ được chứa chữ HOA, số và dấu gạch dưới, không có khoảng trắng hoặc ký tự đặc biệt")
    private String componentCode;

    @NotBlank(message = "Tên cấu phần không được để trống")
    @Size(max = 150, message = "Tên cấu phần không được vượt quá 150 ký tự")
    @Pattern(
            regexp = "^[^\\^#|*@$`~%!&{}\\[\\]?<>\"'():;\\\\=,]+$",
            message = "Tên cấu phần không được chứa ký tự đặc biệt (^, #, |, *, @, $, `, ~, !, %, &, {, }, [, ], ?, <, >, \", ', (, ), /, :, ;, \\, =, dấu phẩy)"
    )
    private String componentName;

    @Size(max = 1500, message = "Chuẩn tin điện không được vượt quá 1500 ký tự")
    private String messageType;

    @Size(max = 1000, message = "Tên kết nối không được vượt quá 1000 ký tự")
    private String connectionMethod;

    @Builder.Default
    @Pattern(regexp = "^[YyNn]$", message = "Kiểm tra token chỉ nhận giá trị Y hoặc N")
    private String checkToken = "N";

    @NotNull(message = "Ngày hiệu lực không được để trống")
    private LocalDateTime effectiveDate;

    private LocalDateTime endEffectiveDate;


}
