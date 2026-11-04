/**
 * Models cho Tham số danh mục theo nhóm (PMH_GROUP_CATEGORY)
 */

export enum GroupCategoryStatus {
  NEW = 1, // Mới
  PENDING = 3, // Chờ duyệt
  APPROVED = 4, // Đã duyệt
  REJECTED = 5, // Từ chối
  CANCELLED = 7, // Hủy duyệt
}

export const GroupCategoryStatusLabels: Record<GroupCategoryStatus, string> = {
  [GroupCategoryStatus.NEW]: "Mới",
  [GroupCategoryStatus.PENDING]: "Chờ duyệt",
  [GroupCategoryStatus.APPROVED]: "Đã duyệt",
  [GroupCategoryStatus.REJECTED]: "Từ chối",
  [GroupCategoryStatus.CANCELLED]: "Hủy duyệt",
};

export const GroupCategoryStatusColors: Record<GroupCategoryStatus, string> = {
  [GroupCategoryStatus.NEW]: "primary",
  [GroupCategoryStatus.PENDING]: "warning",
  [GroupCategoryStatus.APPROVED]: "success",
  [GroupCategoryStatus.REJECTED]: "danger",
  [GroupCategoryStatus.CANCELLED]: "secondary",
};

export interface GroupCategory {
  id: number;
  paramName: string; // PARAM_NAME  — Tên thành phần
  paramValue: string; // PARAM_VALUE — Giá trị thành phần
  paramType: string; // PARAM_TYPE  — Danh mục theo nhóm
  description?: string; // DESCRIPTION
  componentCode: string; // COMPONENT_CODE
  effectiveDate: string; // EFFECTIVE_DATE (ISO string)
  endEffectiveDate?: string; // END_EFFECTIVE_DATE
  newData?: string; // NEW_DATA (JSON string)
  status: GroupCategoryStatus;
  isActive: number; // 0 / 1
  isDisplay: number; // 1 = chưa duyệt, 2 = đã duyệt
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

/** Input cho form Thêm mới / Sửa / Sao chép */
export interface GroupCategoryRequestDTO {
  paramName: string;
  paramValue: string;
  paramType: string;
  description?: string;
  componentCode: string;
  effectiveDate: string;
  endEffectiveDate?: string;
}

/** Tiêu chí tìm kiếm */
export interface GroupCategorySearchDTO {
  paramType?: string;
  paramValue?: string;
  paramName?: string;
  statuses?: GroupCategoryStatus[];
  isActives?: number[];
  page?: number;
  size?: number;
}

/** Response xem chi tiết (dữ liệu cũ + dữ liệu mới chờ duyệt) */
export interface GroupCategoryDetailResponseDTO {
  currentData: GroupCategory;
  newData?: GroupCategoryRequestDTO;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface AuditLog {
  id: number;
  module: string;
  recordId: string;
  action: string;
  performedBy: string;
  actionDate: string;
  description?: string;
  statusBefore?: number;
  statusAfter?: number;
  ipAddress?: string;
}

export interface SelectOption {
  value: any;
  label: string;
}

/** Cấu hình nút chức năng theo trạng thái + role */
export interface GroupCategoryActionConfig {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canClone: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canHistory: boolean;
}
