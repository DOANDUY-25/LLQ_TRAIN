export enum ComponentStatus {
  NEW = 1,
  PENDING = 3,
  APPROVED = 4,
  REJECTED = 5,
  CANCELLED = 7,
}

export const ComponentStatusLabels: Record<ComponentStatus, string> = {
  [ComponentStatus.NEW]: "Mới",
  [ComponentStatus.PENDING]: "Chờ duyệt",
  [ComponentStatus.APPROVED]: "Đã duyệt",
  [ComponentStatus.REJECTED]: "Từ chối",
  [ComponentStatus.CANCELLED]: "Hủy duyệt",
};

export const ComponentStatusColors: Record<ComponentStatus, string> = {
  [ComponentStatus.NEW]: "primary",
  [ComponentStatus.PENDING]: "warning",
  [ComponentStatus.APPROVED]: "success",
  [ComponentStatus.REJECTED]: "danger",
  [ComponentStatus.CANCELLED]: "secondary",
};

export interface Component {
  id: number;
  componentCode: string;
  componentName: string;
  messageType?: string;
  connectionMethod?: string;
  checkToken?: string;
  status: ComponentStatus;
  isActive: number;
  isDisplay: number;
  newData?: string;
  effectiveDate: string;
  endEffectiveDate?: string;
  description?: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

// DTO cho form tạo mới / sửa
export interface ComponentRequestDTO {
  componentCode: string;
  componentName: string;
  messageType?: string;
  connectionMethod?: string;
  checkToken?: string;
  effectiveDate: string;
  endEffectiveDate?: string;
  description?: string;
}

export interface ComponentSearchDTO {
  componentCodes?: string[]; // Mã cấu phần (multi-select)
  componentNames?: string[]; // Tên cấu phần (multi-select)
  statuses?: ComponentStatus[]; // Trạng thái (multi-select)
  isActives?: number[]; // Trạng thái hoạt động (multi-select)
  page?: number;
  size?: number;
}

// hiển thị dữ liệu cũ & mới
export interface ComponentDetailResponseDTO {
  currentData: Component; // Dữ liệu hiện tại
  newData?: ComponentRequestDTO; // Dữ liệu mới (từ NEW_DATA JSON)
}

// DTO cho sao chép
export interface ComponentCloneDTO {
  newComponentCode: string;
  newComponentName?: string;
}

// Response từ API
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Page response
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

// Lịch sử thao tác
export interface AuditLog {
  id: number;
  recordId: string;
  module: string;
  action: string;
  statusBefore?: number;
  statusAfter?: number;
  description: string;
  performedBy: string;
  actionDate: string;
  ipAddress?: string;
}

// Options cho select box
export interface SelectOption {
  value: any;
  label: string;
}

// Cấu hình nút chức năng theo trạng thái
export interface ComponentActionConfig {
  canClone: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
}
