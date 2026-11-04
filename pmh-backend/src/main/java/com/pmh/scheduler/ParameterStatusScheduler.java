package com.pmh.scheduler;

import com.pmh.model.entity.Components;
import com.pmh.model.entity.GroupCategory;
import com.pmh.model.enums.ComponentStatus;
import com.pmh.repository.ComponentRepository;
import com.pmh.repository.GroupCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Slf4j
@Component
@RequiredArgsConstructor
public class ParameterStatusScheduler {

    private final ComponentRepository componentRepository;
    private final GroupCategoryRepository groupCategoryRepository;

    /**
     * Cronjob tự động kiểm tra và cập nhật trạng thái hoạt động (IS_ACTIVE)
     * Chạy định kỳ vào 00:00 mỗi ngày (và có thể gọi thủ công khi cần)
     */
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void autoUpdateActiveStatus() {
        LocalDateTime now = LocalDateTime.now();
        log.info("Bắt đầu chạy Scheduler cập nhật trạng thái hoạt động tham số lúc: {}", now);

        updateComponentsActiveStatus(now);
        updateGroupCategoriesActiveStatus(now);

        log.info("Hoàn tất Scheduler cập nhật trạng thái hoạt động tham số.");
    }

    private void updateComponentsActiveStatus(LocalDateTime now) {
        List<Components> all = componentRepository.findAll();
        int updatedCount = 0;

        for (Components comp : all) {
            boolean shouldBeActive = isWithinEffectiveRange(comp.getEffectiveDate(), comp.getEndEffectiveDate(), now)
                    && Objects.equals(comp.getStatus(), ComponentStatus.APPROVED.getCode());

            int targetActive = shouldBeActive ? 1 : 0;
            if (comp.getIsActive() == null || comp.getIsActive() != targetActive) {
                comp.setIsActive(targetActive);
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            componentRepository.saveAll(all);
            log.info("Đã cập nhật trạng thái hoạt động cho {} cấu phần (Components).", updatedCount);
        }
    }

    private void updateGroupCategoriesActiveStatus(LocalDateTime now) {
        List<GroupCategory> all = groupCategoryRepository.findAll();
        int updatedCount = 0;

        for (GroupCategory gc : all) {
            boolean shouldBeActive = isWithinEffectiveRange(gc.getEffectiveDate(), gc.getEndEffectiveDate(), now)
                    && Objects.equals(gc.getStatus(), ComponentStatus.APPROVED.getCode());

            int targetActive = shouldBeActive ? 1 : 0;
            if (gc.getIsActive() == null || gc.getIsActive() != targetActive) {
                gc.setIsActive(targetActive);
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            groupCategoryRepository.saveAll(all);
            log.info("Đã cập nhật trạng thái hoạt động cho {} danh mục theo nhóm (GroupCategory).", updatedCount);
        }
    }

    private boolean isWithinEffectiveRange(LocalDateTime start, LocalDateTime end, LocalDateTime now) {
        if (start != null && now.isBefore(start)) {
            return false;
        }
        if (end != null && now.isAfter(end)) {
            return false;
        }
        return true;
    }
}
