package com.pmh.model.dto.groupCategory;

import com.pmh.model.entity.GroupCategory;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GroupCategoryDetailResponseDTO {

    /**
     * Dữ liệu hiện tại trong các cột chính
     */
    private GroupCategory currentData;

    /**
     * Dữ liệu mới chờ duyệt (parse từ NEW_DATA JSON), null nếu không có thay đổi
     */
    private GroupCategoryRequestDTO newData;
}
