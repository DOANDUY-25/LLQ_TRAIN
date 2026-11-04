package com.pmh.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pmh.model.dto.groupCategory.GroupCategoryDetailResponseDTO;
import com.pmh.model.dto.groupCategory.GroupCategoryRequestDTO;
import com.pmh.model.dto.groupCategory.GroupCategorySearchDTO;
import com.pmh.model.entity.AuditLog;
import com.pmh.model.entity.GroupCategory;
import com.pmh.model.enums.ComponentStatus;
import com.pmh.repository.GroupCategoryRepository;
import com.pmh.specification.GroupCategorySpecs;
import jakarta.persistence.EntityManager;
import jakarta.persistence.ParameterMode;
import jakarta.persistence.StoredProcedureQuery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupCategoryService {

    private static final String MODULE = "GROUP_CATEGORY";

    private final GroupCategoryRepository groupCategoryRepository;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;
    private final EntityManager entityManager;


    @Transactional(readOnly = true)
    public Page<GroupCategory> search(GroupCategorySearchDTO filter, Pageable pageable) {
        if (filter == null) filter = new GroupCategorySearchDTO();

        int page = (filter.getPage() != null && filter.getPage() >= 0)
                ? filter.getPage() : pageable.getPageNumber();
        int size = (filter.getSize() != null && filter.getSize() > 0)
                ? filter.getSize() : pageable.getPageSize();

        Sort sort = pageable.getSort().isSorted()
                ? pageable.getSort()
                : Sort.by(Sort.Direction.DESC, "updatedDate");

        Pageable finalPageable = PageRequest.of(page, size, sort);

        Specification<GroupCategory> specs = (root, query, cb) -> cb.conjunction();

        if (filter.getParamType() != null && !filter.getParamType().isBlank()) {
            specs = specs.and(GroupCategorySpecs.hasParamType(filter.getParamType()));
        }
        if (filter.getParamValue() != null && !filter.getParamValue().isBlank()) {
            specs = specs.and(GroupCategorySpecs.hasParamValue(filter.getParamValue()));
        }
        if (filter.getParamName() != null && !filter.getParamName().isBlank()) {
            specs = specs.and(GroupCategorySpecs.hasParamName(filter.getParamName()));
        }
        if (filter.getStatuses() != null && !filter.getStatuses().isEmpty()) {
            specs = specs.and(GroupCategorySpecs.hasStatus(filter.getStatuses()));
        }
        if (filter.getIsActives() != null && !filter.getIsActives().isEmpty()) {
            specs = specs.and(GroupCategorySpecs.hasIsActive(filter.getIsActives()));
        }

        return groupCategoryRepository.findAll(specs, finalPageable);
    }


    @Transactional(readOnly = true)
    public GroupCategoryDetailResponseDTO getDetail(Long id) {
        GroupCategory entity = findById(id);

        GroupCategoryRequestDTO newDataDto = null;
        if (entity.getNewData() != null && !entity.getNewData().isBlank()) {
            try {
                newDataDto = objectMapper.readValue(entity.getNewData(), GroupCategoryRequestDTO.class);
            } catch (JsonProcessingException e) {
                log.error("Lỗi parse NEW_DATA cho GroupCategory ID {}: {}", id, e.getMessage());
            }
        }

        return GroupCategoryDetailResponseDTO.builder()
                .currentData(entity)
                .newData(newDataDto)
                .build();
    }


    @Transactional
    public GroupCategory create(GroupCategoryRequestDTO dto) {
        checkDuplicate(dto.getParamName(), dto.getParamType(), dto.getComponentCode(), null);
        validateDates(dto.getEffectiveDate(), dto.getEndEffectiveDate(), true);

        GroupCategory entity = GroupCategory.builder()
                .paramName(dto.getParamName().trim())
                .paramValue(dto.getParamValue().trim())
                .paramType(dto.getParamType().trim())
                .description(dto.getDescription())
                .componentCode(dto.getComponentCode().trim().toUpperCase())
                .effectiveDate(dto.getEffectiveDate())
                .endEffectiveDate(dto.getEndEffectiveDate())
                .newData(null)
                .build();

        entity.setStatus(ComponentStatus.NEW.getCode());
        entity.setIsDisplay(1);
        entity.setIsActive(1);

        GroupCategory saved = groupCategoryRepository.save(entity);
        auditLogService.saveLog(MODULE, saved.getId(), "THÊM MỚI",
                null, saved.getStatus(),
                "Thêm mới tham số danh mục: " + saved.getParamType() + " / " + saved.getParamName());
        return saved;
    }


    /**
     * Quy tắc cốt lõi:
     * - Status = 1 (Mới)          → cập nhật trực tiếp vào bảng
     * - Status = 5/7 (Từ chối/Hủy duyệt) → lưu JSON vào NEW_DATA, chờ Checker duyệt mới merge
     * - Status = 3/4 (Chờ/Đã duyệt)      → chặn, ném exception
     */
    @Transactional
    public GroupCategory update(Long id, GroupCategoryRequestDTO dto) {
        GroupCategory entity = findById(id);
        ComponentStatus status = ComponentStatus.formCode(entity.getStatus());
        validateDates(dto.getEffectiveDate(), dto.getEndEffectiveDate(), false);
        Integer oldStatus = entity.getStatus();

        switch (status) {
            case NEW -> {
                checkDuplicate(dto.getParamName(), dto.getParamType(), dto.getComponentCode(), id);
                entity.setParamName(dto.getParamName().trim());
                entity.setParamValue(dto.getParamValue().trim());
                entity.setParamType(dto.getParamType().trim());
                entity.setDescription(dto.getDescription());
                entity.setComponentCode(dto.getComponentCode().trim().toUpperCase());
                entity.setEffectiveDate(dto.getEffectiveDate());
                entity.setEndEffectiveDate(dto.getEndEffectiveDate());
                entity.setNewData(null);
            }
            case REJECTED, CANCELLED -> {
                try {
                    entity.setNewData(objectMapper.writeValueAsString(dto));
                } catch (JsonProcessingException e) {
                    throw new RuntimeException("Lỗi chuyển đổi dữ liệu sang JSON: " + e.getMessage());
                }
            }
            case PENDING ->
                    throw new RuntimeException("Bản ghi đang ở trạng thái 'Chờ duyệt', không được phép chỉnh sửa!");
            case APPROVED ->
                    throw new RuntimeException("Bản ghi đang ở trạng thái 'Đã duyệt'! Vui lòng Hủy duyệt trước khi sửa.");
            default -> throw new RuntimeException("Không được phép sửa bản ghi ở trạng thái hiện tại!");
        }

        GroupCategory saved = groupCategoryRepository.save(entity);
        auditLogService.saveLog(MODULE, saved.getId(), "CẬP NHẬT",
                oldStatus, saved.getStatus(),
                "Cập nhật tham số danh mục: " + saved.getParamType() + " / " + saved.getParamName());
        return saved;
    }


    @Transactional
    public void delete(Long id) {
        GroupCategory entity = findById(id);

        if (entity.getIsDisplay() != null && entity.getIsDisplay() == 2) {
            throw new RuntimeException("Bản ghi đã từng được phê duyệt (IS_DISPLAY=2), không được phép xóa!");
        }
        if (entity.getStatus() == null || entity.getStatus() != ComponentStatus.NEW.getCode()) {
            throw new RuntimeException("Chỉ được phép xóa bản ghi ở trạng thái 'Mới'!");
        }

        auditLogService.saveLog(MODULE, entity.getId(), "XÓA",
                entity.getStatus(), null,
                "Xóa tham số danh mục: " + entity.getParamType() + " / " + entity.getParamName());
        groupCategoryRepository.delete(entity);
    }


    @Transactional
    public GroupCategory clone(Long sourceId, GroupCategoryRequestDTO dto) {
        GroupCategory source = findById(sourceId);
        checkDuplicate(dto.getParamName(), dto.getParamType(), dto.getComponentCode(), null);
        validateDates(dto.getEffectiveDate(), dto.getEndEffectiveDate(), true);

        GroupCategory cloned = GroupCategory.builder()
                .paramName(dto.getParamName().trim())
                .paramValue(dto.getParamValue().trim())
                .paramType(dto.getParamType().trim())
                .description(dto.getDescription() != null ? dto.getDescription() : source.getDescription())
                .componentCode(dto.getComponentCode().trim().toUpperCase())
                .effectiveDate(dto.getEffectiveDate())
                .endEffectiveDate(dto.getEndEffectiveDate())
                .newData(null)
                .build();

        cloned.setStatus(ComponentStatus.NEW.getCode());
        cloned.setIsDisplay(1);
        cloned.setIsActive(1);

        GroupCategory saved = groupCategoryRepository.save(cloned);
        auditLogService.saveLog(MODULE, saved.getId(), "SAO CHÉP",
                null, saved.getStatus(),
                "Sao chép từ ID " + sourceId + " → " + saved.getParamType() + " / " + saved.getParamName());
        return saved;
    }


    @Transactional
    public void submitApproval(List<Long> ids) {
        List<GroupCategory> list = groupCategoryRepository.findAllById(ids);
        for (GroupCategory g : list) {
            int s = g.getStatus();
            if (s != ComponentStatus.NEW.getCode()
                    && s != ComponentStatus.REJECTED.getCode()
                    && s != ComponentStatus.CANCELLED.getCode()) {
                throw new RuntimeException(
                        "Trạng thái không hợp lệ để gửi duyệt: " + g.getParamName());
            }
            Integer oldStatus = g.getStatus();
            g.setStatus(ComponentStatus.PENDING.getCode());
            auditLogService.saveLog(MODULE, g.getId(), "GỬI DUYỆT",
                    oldStatus, g.getStatus(),
                    "Gửi duyệt tham số danh mục: " + g.getParamType() + " / " + g.getParamName());
        }
        groupCategoryRepository.saveAll(list);
    }

    @Transactional
    public void approval(List<Long> ids) {
        List<GroupCategory> list = groupCategoryRepository.findAllById(ids);
        for (GroupCategory g : list) {
            if (g.getStatus() != ComponentStatus.PENDING.getCode()) {
                throw new RuntimeException(
                        "Trạng thái không hợp lệ để phê duyệt: " + g.getParamName());
            }
            Integer oldStatus = g.getStatus();
            g.setStatus(ComponentStatus.APPROVED.getCode());
            g.setIsDisplay(2);  // Đã duyệt ít nhất 1 lần → không cho xóa nữa

            // Merge NEW_DATA vào các cột chính nếu có
            if (g.getNewData() != null && !g.getNewData().isBlank()) {
                try {
                    GroupCategoryRequestDTO nd = objectMapper.readValue(
                            g.getNewData(), GroupCategoryRequestDTO.class);
                    if (nd.getParamName() != null) g.setParamName(nd.getParamName().trim());
                    if (nd.getParamValue() != null) g.setParamValue(nd.getParamValue().trim());
                    if (nd.getParamType() != null) g.setParamType(nd.getParamType().trim());
                    if (nd.getDescription() != null) g.setDescription(nd.getDescription());
                    if (nd.getComponentCode() != null) g.setComponentCode(nd.getComponentCode().trim().toUpperCase());
                    if (nd.getEffectiveDate() != null) g.setEffectiveDate(nd.getEffectiveDate());
                    g.setEndEffectiveDate(nd.getEndEffectiveDate());
                    g.setNewData(null);
                } catch (Exception e) {
                    log.error("Lỗi merge NEW_DATA khi duyệt GroupCategory ID {}: {}", g.getId(), e.getMessage());
                }
            }

            auditLogService.saveLog(MODULE, g.getId(), "PHÊ DUYỆT",
                    oldStatus, g.getStatus(),
                    "Phê duyệt tham số danh mục: " + g.getParamType() + " / " + g.getParamName());
        }
        groupCategoryRepository.saveAll(list);
    }

    @Transactional
    public void reject(List<Long> ids, String reason) {
        List<GroupCategory> list = groupCategoryRepository.findAllById(ids);
        for (GroupCategory g : list) {
            if (g.getStatus() != ComponentStatus.PENDING.getCode()) {
                throw new RuntimeException(
                        "Trạng thái không hợp lệ để từ chối: " + g.getParamName());
            }
            Integer oldStatus = g.getStatus();
            g.setStatus(ComponentStatus.REJECTED.getCode());
            String desc = "Từ chối tham số danh mục: " + g.getParamType() + " / " + g.getParamName();
            if (reason != null && !reason.isBlank()) desc += " | Lý do: " + reason;
            auditLogService.saveLog(MODULE, g.getId(), "TỪ CHỐI", oldStatus, g.getStatus(), desc);
        }
        groupCategoryRepository.saveAll(list);
    }

    @Transactional
    public void cancelApproval(List<Long> ids) {
        List<GroupCategory> list = groupCategoryRepository.findAllById(ids);
        for (GroupCategory g : list) {
            if (g.getStatus() != ComponentStatus.APPROVED.getCode()) {
                throw new RuntimeException(
                        "Trạng thái không hợp lệ để hủy duyệt: " + g.getParamName());
            }
            Integer oldStatus = g.getStatus();
            g.setStatus(ComponentStatus.CANCELLED.getCode());
            auditLogService.saveLog(MODULE, g.getId(), "HỦY DUYỆT",
                    oldStatus, g.getStatus(),
                    "Hủy duyệt tham số danh mục: " + g.getParamType() + " / " + g.getParamName());
        }
        groupCategoryRepository.saveAll(list);
    }


    @Transactional(readOnly = true)
    public List<String> getDistinctParamTypes() {
        return groupCategoryRepository.findDistinctParamTypes();
    }

    @Transactional(readOnly = true)
    public List<String> getDistinctComponentCodes() {
        return groupCategoryRepository.findDistinctComponentCodes();
    }


    @Transactional(readOnly = true)
    public Page<AuditLog> getHistory(String id, Pageable pageable) {
        return auditLogService.getHistory(id, pageable);
    }


    private GroupCategory findById(Long id) {
        return groupCategoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy tham số danh mục với ID: " + id));
    }

    /**
     * Kiểm tra trùng (paramName + paramType + componentCode)
     */
    private void checkDuplicate(String paramName, String paramType, String componentCode, Long excludeId) {
        boolean exists = excludeId == null
                ? groupCategoryRepository.existsByParamNameAndParamTypeAndComponentCode(
                paramName, paramType, componentCode)
                : groupCategoryRepository.existsByParamNameAndParamTypeAndComponentCodeAndIdNot(
                paramName, paramType, componentCode, excludeId);
        if (exists) {
            throw new RuntimeException(
                    "Tham số danh mục với Tên '" + paramName
                            + "', Loại '" + paramType
                            + "', Cấu phần '" + componentCode + "' đã tồn tại!");
        }
    }

    private void validateDates(LocalDateTime effectiveDate, LocalDateTime endEffectiveDate, boolean checkPast) {
        if (effectiveDate == null) {
            throw new RuntimeException("Ngày hiệu lực không được để trống!");
        }
        if (checkPast && effectiveDate.isBefore(LocalDateTime.now().minusMinutes(5))) {
            throw new RuntimeException("Ngày hiệu lực không hợp lệ! Không được chọn thời gian trong quá khứ.");
        }
        if (endEffectiveDate != null && endEffectiveDate.isBefore(effectiveDate)) {
            throw new RuntimeException("Ngày hết hiệu lực phải lớn hơn hoặc bằng ngày hiệu lực!");
        }
    }

    private String getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            return auth.getName();
        }
        return "system";
    }

    // =========================================================================
    // ─── PHƯƠNG THỨC GỌI STORED PROCEDURE (DẠNG 3: PROCEDURE) ────────────────
    // =========================================================================

    /**
     * Tìm kiếm và phân trang bằng Stored Procedure SP_GROUP_CATEGORY_SEARCH
     */
    @Transactional(readOnly = true)
    public Page<GroupCategory> searchByProcedure(GroupCategorySearchDTO filter, Pageable pageable) {
        if (filter == null) filter = new GroupCategorySearchDTO();

        int page = (filter.getPage() != null && filter.getPage() >= 0)
                ? filter.getPage() : pageable.getPageNumber();
        int size = (filter.getSize() != null && filter.getSize() > 0)
                ? filter.getSize() : pageable.getPageSize();

        String statusCsv = (filter.getStatuses() != null && !filter.getStatuses().isEmpty())
                ? filter.getStatuses().stream().map(String::valueOf).collect(Collectors.joining(","))
                : null;

        String isActiveCsv = (filter.getIsActives() != null && !filter.getIsActives().isEmpty())
                ? filter.getIsActives().stream().map(String::valueOf).collect(Collectors.joining(","))
                : null;

        StoredProcedureQuery query = entityManager.createStoredProcedureQuery("SP_GROUP_CATEGORY_SEARCH", GroupCategory.class);
        query.registerStoredProcedureParameter("p_param_type", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_param_name", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_param_value", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_status_csv", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_is_active_csv", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_page", Integer.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_size", Integer.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_total_count", Long.class, ParameterMode.OUT);
        query.registerStoredProcedureParameter("p_recordset", void.class, ParameterMode.REF_CURSOR);

        query.setParameter("p_param_type", filter.getParamType());
        query.setParameter("p_param_name", filter.getParamName());
        query.setParameter("p_param_value", filter.getParamValue());
        query.setParameter("p_status_csv", statusCsv);
        query.setParameter("p_is_active_csv", isActiveCsv);
        query.setParameter("p_page", page);
        query.setParameter("p_size", size);

        query.execute();

        @SuppressWarnings("unchecked")
        List<GroupCategory> resultList = query.getResultList();
        Long totalCount = (Long) query.getOutputParameterValue("p_total_count");
        long total = totalCount != null ? totalCount : 0L;

        Pageable finalPageable = PageRequest.of(page, size, pageable.getSort());
        return new PageImpl<>(resultList, finalPageable, total);
    }

    /**
     * Xem chi tiết bằng Stored Procedure SP_GROUP_CATEGORY_DETAIL
     */
    @Transactional(readOnly = true)
    public GroupCategoryDetailResponseDTO getDetailByProcedure(Long id) {
        StoredProcedureQuery query = entityManager.createStoredProcedureQuery("SP_GROUP_CATEGORY_DETAIL", GroupCategory.class);
        query.registerStoredProcedureParameter("p_id", Long.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_recordset", void.class, ParameterMode.REF_CURSOR);

        query.setParameter("p_id", id);
        query.execute();

        @SuppressWarnings("unchecked")
        List<GroupCategory> list = query.getResultList();
        if (list.isEmpty()) {
            throw new RuntimeException("Không tìm thấy tham số danh mục với ID: " + id);
        }
        GroupCategory entity = list.get(0);

        GroupCategoryRequestDTO newDataDto = null;
        if (entity.getNewData() != null && !entity.getNewData().isBlank()) {
            try {
                newDataDto = objectMapper.readValue(entity.getNewData(), GroupCategoryRequestDTO.class);
            } catch (JsonProcessingException e) {
                log.error("Lỗi parse NEW_DATA từ Procedure cho ID {}: {}", id, e.getMessage());
            }
        }

        return GroupCategoryDetailResponseDTO.builder()
                .currentData(entity)
                .newData(newDataDto)
                .build();
    }

    /**
     * Thêm mới bằng Stored Procedure SP_GROUP_CATEGORY_CREATE
     */
    @Transactional
    public GroupCategory createByProcedure(GroupCategoryRequestDTO dto) {
        validateDates(dto.getEffectiveDate(), dto.getEndEffectiveDate(), true);

        String currentUser = getCurrentUser();

        StoredProcedureQuery query = entityManager.createStoredProcedureQuery("SP_GROUP_CATEGORY_CREATE");
        query.registerStoredProcedureParameter("p_param_name", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_param_value", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_param_type", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_description", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_component_code", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_effective_date", Timestamp.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_end_effective_date", Timestamp.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_created_by", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_new_id", Long.class, ParameterMode.OUT);
        query.registerStoredProcedureParameter("p_response_code", String.class, ParameterMode.OUT);
        query.registerStoredProcedureParameter("p_response_message", String.class, ParameterMode.OUT);

        query.setParameter("p_param_name", dto.getParamName() != null ? dto.getParamName().trim() : null);
        query.setParameter("p_param_value", dto.getParamValue() != null ? dto.getParamValue().trim() : null);
        query.setParameter("p_param_type", dto.getParamType() != null ? dto.getParamType().trim() : null);
        query.setParameter("p_description", dto.getDescription());
        query.setParameter("p_component_code", dto.getComponentCode() != null ? dto.getComponentCode().trim().toUpperCase() : null);
        query.setParameter("p_effective_date", dto.getEffectiveDate() != null ? Timestamp.valueOf(dto.getEffectiveDate()) : null);
        query.setParameter("p_end_effective_date", dto.getEndEffectiveDate() != null ? Timestamp.valueOf(dto.getEndEffectiveDate()) : null);
        query.setParameter("p_created_by", currentUser);

        query.execute();

        String responseCode = (String) query.getOutputParameterValue("p_response_code");
        String responseMessage = (String) query.getOutputParameterValue("p_response_message");

        if (!"SUCCESS".equalsIgnoreCase(responseCode)) {
            throw new RuntimeException(responseMessage);
        }

        Long createdId = (Long) query.getOutputParameterValue("p_new_id");

        auditLogService.saveLog(MODULE, createdId, "THÊM MỚI (PROCEDURE)",
                null, ComponentStatus.NEW.getCode(),
                "Thêm mới tham số danh mục qua Procedure: " + dto.getParamType() + " / " + dto.getParamName());

        return findById(createdId);
    }

    /**
     * Cập nhật bằng Stored Procedure SP_GROUP_CATEGORY_UPDATE
     */
    @Transactional
    public GroupCategory updateByProcedure(Long id, GroupCategoryRequestDTO dto) {
        GroupCategory existing = findById(id);
        Integer oldStatus = existing.getStatus();
        validateDates(dto.getEffectiveDate(), dto.getEndEffectiveDate(), false);

        String currentUser = getCurrentUser();
        String newDataJson = null;

        if (existing.getStatus() == ComponentStatus.REJECTED.getCode() || existing.getStatus() == ComponentStatus.CANCELLED.getCode()) {
            try {
                newDataJson = objectMapper.writeValueAsString(dto);
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Lỗi chuyển đổi dữ liệu sang JSON: " + e.getMessage());
            }
        }

        StoredProcedureQuery query = entityManager.createStoredProcedureQuery("SP_GROUP_CATEGORY_UPDATE");
        query.registerStoredProcedureParameter("p_id", Long.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_param_name", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_param_value", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_param_type", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_description", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_component_code", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_effective_date", Timestamp.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_end_effective_date", Timestamp.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_new_data_json", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_updated_by", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_response_code", String.class, ParameterMode.OUT);
        query.registerStoredProcedureParameter("p_response_message", String.class, ParameterMode.OUT);

        query.setParameter("p_id", id);
        query.setParameter("p_param_name", dto.getParamName() != null ? dto.getParamName().trim() : null);
        query.setParameter("p_param_value", dto.getParamValue() != null ? dto.getParamValue().trim() : null);
        query.setParameter("p_param_type", dto.getParamType() != null ? dto.getParamType().trim() : null);
        query.setParameter("p_description", dto.getDescription());
        query.setParameter("p_component_code", dto.getComponentCode() != null ? dto.getComponentCode().trim().toUpperCase() : null);
        query.setParameter("p_effective_date", dto.getEffectiveDate() != null ? Timestamp.valueOf(dto.getEffectiveDate()) : null);
        query.setParameter("p_end_effective_date", dto.getEndEffectiveDate() != null ? Timestamp.valueOf(dto.getEndEffectiveDate()) : null);
        query.setParameter("p_new_data_json", newDataJson);
        query.setParameter("p_updated_by", currentUser);

        query.execute();

        String responseCode = (String) query.getOutputParameterValue("p_response_code");
        String responseMessage = (String) query.getOutputParameterValue("p_response_message");

        if (!"SUCCESS".equalsIgnoreCase(responseCode)) {
            throw new RuntimeException(responseMessage);
        }

        GroupCategory updated = findById(id);
        auditLogService.saveLog(MODULE, id, "CẬP NHẬT (PROCEDURE)",
                oldStatus, updated.getStatus(),
                "Cập nhật tham số danh mục qua Procedure: " + updated.getParamType() + " / " + updated.getParamName());

        return updated;
    }

    /**
     * Xóa bằng Stored Procedure SP_GROUP_CATEGORY_DELETE
     */
    @Transactional
    public void deleteByProcedure(Long id) {
        GroupCategory entity = findById(id);

        StoredProcedureQuery query = entityManager.createStoredProcedureQuery("SP_GROUP_CATEGORY_DELETE");
        query.registerStoredProcedureParameter("p_id", Long.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_response_code", String.class, ParameterMode.OUT);
        query.registerStoredProcedureParameter("p_response_message", String.class, ParameterMode.OUT);

        query.setParameter("p_id", id);
        query.execute();

        String responseCode = (String) query.getOutputParameterValue("p_response_code");
        String responseMessage = (String) query.getOutputParameterValue("p_response_message");

        if (!"SUCCESS".equalsIgnoreCase(responseCode)) {
            throw new RuntimeException(responseMessage);
        }

        auditLogService.saveLog(MODULE, id, "XÓA (PROCEDURE)",
                entity.getStatus(), null,
                "Xóa tham số danh mục qua Procedure: " + entity.getParamType() + " / " + entity.getParamName());
    }

    /**
     * Gửi duyệt hàng loạt bằng Stored Procedure SP_GROUP_CATEGORY_SUBMIT
     */
    @Transactional
    public void submitApprovalByProcedure(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new RuntimeException("Danh sách ID gửi duyệt không được để trống!");
        }
        String idsCsv = ids.stream().map(String::valueOf).collect(Collectors.joining(","));
        String currentUser = getCurrentUser();

        StoredProcedureQuery query = entityManager.createStoredProcedureQuery("SP_GROUP_CATEGORY_SUBMIT");
        query.registerStoredProcedureParameter("p_ids_csv", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_user", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_response_code", String.class, ParameterMode.OUT);
        query.registerStoredProcedureParameter("p_response_message", String.class, ParameterMode.OUT);

        query.setParameter("p_ids_csv", idsCsv);
        query.setParameter("p_user", currentUser);
        query.execute();

        String responseCode = (String) query.getOutputParameterValue("p_response_code");
        String responseMessage = (String) query.getOutputParameterValue("p_response_message");

        if (!"SUCCESS".equalsIgnoreCase(responseCode)) {
            throw new RuntimeException(responseMessage);
        }

        for (Long id : ids) {
            auditLogService.saveLog(MODULE, id, "GỬI DUYỆT (PROCEDURE)",
                    null, ComponentStatus.PENDING.getCode(),
                    "Gửi duyệt qua Procedure cho ID: " + id);
        }
    }

    /**
     * Phê duyệt hàng loạt bằng Stored Procedure SP_GROUP_CATEGORY_APPROVE
     */
    @Transactional
    public void approvalByProcedure(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new RuntimeException("Danh sách ID phê duyệt không được để trống!");
        }
        String idsCsv = ids.stream().map(String::valueOf).collect(Collectors.joining(","));
        String currentUser = getCurrentUser();

        StoredProcedureQuery query = entityManager.createStoredProcedureQuery("SP_GROUP_CATEGORY_APPROVE");
        query.registerStoredProcedureParameter("p_ids_csv", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_user", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_response_code", String.class, ParameterMode.OUT);
        query.registerStoredProcedureParameter("p_response_message", String.class, ParameterMode.OUT);

        query.setParameter("p_ids_csv", idsCsv);
        query.setParameter("p_user", currentUser);
        query.execute();

        String responseCode = (String) query.getOutputParameterValue("p_response_code");
        String responseMessage = (String) query.getOutputParameterValue("p_response_message");

        if (!"SUCCESS".equalsIgnoreCase(responseCode)) {
            throw new RuntimeException(responseMessage);
        }

        for (Long id : ids) {
            auditLogService.saveLog(MODULE, id, "PHÊ DUYỆT (PROCEDURE)",
                    ComponentStatus.PENDING.getCode(), ComponentStatus.APPROVED.getCode(),
                    "Phê duyệt qua Procedure cho ID: " + id);
        }
    }

    /**
     * Từ chối hàng loạt bằng Stored Procedure SP_GROUP_CATEGORY_REJECT
     */
    @Transactional
    public void rejectByProcedure(List<Long> ids, String reason) {
        if (ids == null || ids.isEmpty()) {
            throw new RuntimeException("Danh sách ID từ chối không được để trống!");
        }
        String idsCsv = ids.stream().map(String::valueOf).collect(Collectors.joining(","));
        String currentUser = getCurrentUser();

        StoredProcedureQuery query = entityManager.createStoredProcedureQuery("SP_GROUP_CATEGORY_REJECT");
        query.registerStoredProcedureParameter("p_ids_csv", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_reason", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_user", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_response_code", String.class, ParameterMode.OUT);
        query.registerStoredProcedureParameter("p_response_message", String.class, ParameterMode.OUT);

        query.setParameter("p_ids_csv", idsCsv);
        query.setParameter("p_reason", reason);
        query.setParameter("p_user", currentUser);
        query.execute();

        String responseCode = (String) query.getOutputParameterValue("p_response_code");
        String responseMessage = (String) query.getOutputParameterValue("p_response_message");

        if (!"SUCCESS".equalsIgnoreCase(responseCode)) {
            throw new RuntimeException(responseMessage);
        }

        for (Long id : ids) {
            auditLogService.saveLog(MODULE, id, "TỪ CHỐI (PROCEDURE)",
                    ComponentStatus.PENDING.getCode(), ComponentStatus.REJECTED.getCode(),
                    "Từ chối qua Procedure cho ID: " + id + (reason != null ? " | Lý do: " + reason : ""));
        }
    }

    /**
     * Hủy duyệt hàng loạt bằng Stored Procedure SP_GROUP_CATEGORY_CANCEL
     */
    @Transactional
    public void cancelApprovalByProcedure(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new RuntimeException("Danh sách ID hủy duyệt không được để trống!");
        }
        String idsCsv = ids.stream().map(String::valueOf).collect(Collectors.joining(","));
        String currentUser = getCurrentUser();

        StoredProcedureQuery query = entityManager.createStoredProcedureQuery("SP_GROUP_CATEGORY_CANCEL");
        query.registerStoredProcedureParameter("p_ids_csv", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_user", String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter("p_response_code", String.class, ParameterMode.OUT);
        query.registerStoredProcedureParameter("p_response_message", String.class, ParameterMode.OUT);

        query.setParameter("p_ids_csv", idsCsv);
        query.setParameter("p_user", currentUser);
        query.execute();

        String responseCode = (String) query.getOutputParameterValue("p_response_code");
        String responseMessage = (String) query.getOutputParameterValue("p_response_message");

        if (!"SUCCESS".equalsIgnoreCase(responseCode)) {
            throw new RuntimeException(responseMessage);
        }

        for (Long id : ids) {
            auditLogService.saveLog(MODULE, id, "HỦY DUYỆT (PROCEDURE)",
                    ComponentStatus.APPROVED.getCode(), ComponentStatus.CANCELLED.getCode(),
                    "Hủy duyệt qua Procedure cho ID: " + id);
        }
    }
}
