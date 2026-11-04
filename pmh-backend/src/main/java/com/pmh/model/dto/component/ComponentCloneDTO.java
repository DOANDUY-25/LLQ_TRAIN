package com.pmh.model.dto.component;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComponentCloneDTO {
    @NotBlank(message = "Mã cấu phần mới không được để trống")
    @Size(max = 20, message = "Mã cấu phần không được vượt quá 20 ký tự")
    @Pattern(regexp = "^[A-Z0-9_]+$", message = "Mã cấu phần chỉ được chứa chữ HOA, số và dấu gạch dưới")
    private String newComponentCode;

    @Size(max = 150, message = "Tên cấu phần không được vượt quá 150 ký tự")
    @Pattern(
        regexp = "^[^\\^#|*@$`~%!&{}\\[\\]?<>\"'():;\\\\=,]*$",
        message = "Tên cấu phần không được chứa ký tự đặc biệt (^, #, |, *, @, $, `, ~, !, %, &, {, }, [, ], ?, <, >, \", ', (, ), /, :, ;, \\, =, dấu phẩy)"
    )
    private String newComponentName;
}

