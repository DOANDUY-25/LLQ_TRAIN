package com.pmh.model.dto.component;

import com.pmh.model.entity.Components;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComponentDetailResponseDTO {
    // Dữ liệu hiện tại trong cơ sở dữ liệu (Dữ liệu cũ)
    private Components currentData;

    // Dữ liệu mới thay đổi (được parse từ chuỗi JSON trong cột NEW_DATA)
    private ComponentRequestDTO newData;
}
