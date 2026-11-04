import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import {
  ComponentDetailResponseDTO,
  ComponentStatus,
  ComponentStatusLabels,
  ComponentStatusColors,
  Component as ComponentModel,
  ComponentRequestDTO
} from '../../../models/component.model';
import { ComponentService } from '../../../core/services/component.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

export type ModalAction = 'view' | 'submit' | 'cancel_approval' | 'approve' | 'history';

@Component({
  selector: 'app-detail-modal',
  templateUrl: './detail-modal.component.html',
  styleUrls: ['./detail-modal.component.css']
})
export class DetailModalComponent implements OnInit {
  @Input() componentId!: number;
  @Input() action: ModalAction = 'view';

  /** Emitted khi cần đóng modal và refresh list */
  @Output() closed = new EventEmitter<boolean>(); // true = cần reload

  detail?: ComponentDetailResponseDTO;
  loading = false;
  actionLoading = false;
  rejectReason = '';
  showRejectInput = false;

  ComponentStatus = ComponentStatus;

  constructor(
    private componentService: ComponentService,
    private notify: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDetail();
  }

  loadDetail(): void {
    this.loading = true;
    this.componentService.getDetail(this.componentId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.detail = res.data;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.close(false);
      }
    });
  }

  get currentData(): ComponentModel | undefined {
    return this.detail?.currentData;
  }

  get newDataParsed(): ComponentRequestDTO | undefined {
    if (!this.detail?.currentData?.newData) return undefined;
    try {
      return JSON.parse(this.detail.currentData.newData);
    } catch {
      return this.detail.newData;
    }
  }

  get hasNewData(): boolean {
    return !!(this.newDataParsed || this.detail?.newData);
  }

  get displayNewData(): ComponentRequestDTO | undefined {
    return this.newDataParsed ?? this.detail?.newData;
  }

  get status(): ComponentStatus | undefined {
    return this.currentData?.status;
  }

  getStatusLabel(status: ComponentStatus): string {
    return ComponentStatusLabels[status] ?? 'Không xác định';
  }

  getStatusColor(status: ComponentStatus): string {
    return ComponentStatusColors[status] ?? 'secondary';
  }

  /**
   * Kiểm tra user có role CHECKER không
   * Chỉ CHECKER mới được phê duyệt/từ chối
   */
  isChecker(): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.roles) return false;
    
    return currentUser.roles.some((role: any) => {
      const roleCode = typeof role === 'string' ? role : (role.roleCode || '');
      return roleCode.toUpperCase().includes('CHECKER');
    });
  }

  isChanged(field: keyof ComponentRequestDTO): boolean {
    if (!this.displayNewData || !this.currentData) return false;
    const oldVal = (this.currentData as any)[this.mapField(field)];
    const newVal = (this.displayNewData as any)[field];
    return oldVal !== newVal;
  }

  private mapField(field: keyof ComponentRequestDTO): keyof ComponentModel {
    const map: Partial<Record<keyof ComponentRequestDTO, keyof ComponentModel>> = {
      componentCode: 'componentCode',
      componentName: 'componentName',
      messageType: 'messageType',
      connectionMethod: 'connectionMethod',
      checkToken: 'checkToken',
      effectiveDate: 'effectiveDate',
      endEffectiveDate: 'endEffectiveDate'
    };
    return map[field] ?? (field as keyof ComponentModel);
  }

  formatDate(val?: string | null): string {
    if (!val) return '';
    try {
      const d = new Date(val);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch { return val; }
  }

  /* ---- Các action buttons ---- */

  /** Gửi duyệt */
  onSubmitApproval(): void {
    if (!this.componentId) return;
    this.actionLoading = true;
    this.componentService.submitApproval([this.componentId]).subscribe({
      next: () => {
        this.notify.showSuccess('Gửi duyệt thành công!');
        this.close(true);
      },
      error: (err) => {
        this.notify.showError('Gửi duyệt thất bại: ' + (err.error?.message || err.message));
        this.actionLoading = false;
      }
    });
  }

  /** Xóa (status = Mới / Từ chối, IS_DISPLAY = 1) */
  onDelete(): void {
    if (!confirm('Bạn có chắc muốn xóa bản ghi này?')) return;
    this.actionLoading = true;
    this.componentService.delete(this.componentId).subscribe({
      next: () => {
        this.notify.showSuccess('Xóa bản ghi thành công!');
        this.close(true);
      },
      error: (err) => {
        this.notify.showError('Xóa thất bại: ' + (err.error?.message || err.message));
        this.actionLoading = false;
      }
    });
  }

  /** Hủy phê duyệt (status = Đã duyệt) */
  onCancelApproval(): void {
    if (!confirm('Bạn có chắc muốn hủy phê duyệt bản ghi này?')) return;
    this.actionLoading = true;
    this.componentService.cancelApproval([this.componentId]).subscribe({
      next: () => {
        this.notify.showSuccess('Hủy phê duyệt thành công!');
        this.close(true);
      },
      error: (err) => {
        this.notify.showError('Hủy phê duyệt thất bại: ' + (err.error?.message || err.message));
        this.actionLoading = false;
      }
    });
  }

  /** Phê duyệt (Checker, status = Chờ duyệt) */
  onApprove(): void {
    this.actionLoading = true;
    this.componentService.approval([this.componentId]).subscribe({
      next: () => {
        this.notify.showSuccess('Phê duyệt thành công!');
        this.close(true);
      },
      error: (err) => {
        this.notify.showError('Phê duyệt thất bại: ' + (err.error?.message || err.message));
        this.actionLoading = false;
      }
    });
  }

  /** Hiện input nhập lý do từ chối */
  onShowRejectInput(): void {
    this.showRejectInput = true;
  }

  /** Từ chối (Checker, status = Chờ duyệt) */
  onReject(): void {
    if (!this.rejectReason.trim()) {
      this.notify.showWarning('Vui lòng nhập lý do từ chối.');
      return;
    }
    this.actionLoading = true;
    this.componentService.reject([this.componentId]).subscribe({
      next: () => {
        this.notify.showSuccess('Từ chối bản ghi thành công!');
        this.close(true);
      },
      error: (err) => {
        this.notify.showError('Từ chối thất bại: ' + (err.error?.message || err.message));
        this.actionLoading = false;
      }
    });
  }

  close(reload: boolean): void {
    this.closed.emit(reload);
  }
}
