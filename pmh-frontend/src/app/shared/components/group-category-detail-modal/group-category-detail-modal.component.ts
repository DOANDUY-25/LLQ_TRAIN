import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import {
  GroupCategoryDetailResponseDTO,
  GroupCategoryStatus,
  GroupCategoryStatusLabels,
  GroupCategoryStatusColors,
  GroupCategory,
  GroupCategoryRequestDTO
} from '../../../models/group-category.model';
import { GroupCategoryService } from '../../../core/services/group-category.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-group-category-detail-modal',
  templateUrl: './group-category-detail-modal.component.html',
  styleUrls: ['./group-category-detail-modal.component.scss']
})
export class GroupCategoryDetailModalComponent implements OnInit {

  @Input() groupCategoryId!: number;

  /** true = cần reload list sau khi đóng */
  @Output() closed = new EventEmitter<boolean>();

  detail?: GroupCategoryDetailResponseDTO;
  loading = false;
  actionLoading = false;

  /** Hiển thị input lý do từ chối */
  showRejectInput = false;
  rejectReason = '';

  GroupCategoryStatus = GroupCategoryStatus; // expose to template

  constructor(
    private gcService: GroupCategoryService,
    private notify: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDetail();
  }

  loadDetail(): void {
    this.loading = true;
    this.gcService.getDetail(this.groupCategoryId).subscribe({
      next: res => {
        if (res.success) this.detail = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.close(false);
      }
    });
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

  get current(): GroupCategory | undefined {
    return this.detail?.currentData;
  }

  get newData(): GroupCategoryRequestDTO | undefined {
    if (!this.detail) return undefined;
    // newData từ server có thể là object trực tiếp (đã parse)
    // hoặc cần parse từ currentData.newData JSON string
    if (this.detail.newData) return this.detail.newData;
    if (this.current?.newData) {
      try { return JSON.parse(this.current.newData); } catch { return undefined; }
    }
    return undefined;
  }

  get status(): GroupCategoryStatus | undefined {
    return this.current?.status;
  }

  get hasNewData(): boolean {
    return !!this.newData;
  }

  getStatusLabel(s: GroupCategoryStatus): string {
    return GroupCategoryStatusLabels[s] ?? '';
  }

  getStatusColor(s: GroupCategoryStatus): string {
    return GroupCategoryStatusColors[s] ?? 'secondary';
  }

  /** Kiểm tra field có thay đổi giữa current và newData */
  isChanged(field: keyof GroupCategoryRequestDTO): boolean {
    if (!this.newData || !this.current) return false;
    const oldVal = (this.current as any)[field];
    const newVal = (this.newData as any)[field];
    return String(oldVal ?? '') !== String(newVal ?? '');
  }

  formatDate(v?: string | null): string {
    if (!v) return '—';
    try {
      const d = new Date(v);
      const p = (n: number) => n.toString().padStart(2, '0');
      return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    } catch { return v; }
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

  // ─── Actions ───────────────────────────────────────────────────────────────

  onSubmitApproval(): void {
    this.actionLoading = true;
    this.gcService.submitApproval([this.groupCategoryId]).subscribe({
      next: () => {
        this.notify.showSuccess('Gửi duyệt thành công!');
        this.close(true);
      },
      error: err => {
        this.notify.showError('Gửi duyệt thất bại: ' + (err.error?.message || err.message));
        this.actionLoading = false;
      }
    });
  }

  onDelete(): void {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;
    this.actionLoading = true;
    this.gcService.delete(this.groupCategoryId).subscribe({
      next: () => {
        this.notify.showSuccess('Xóa bản ghi thành công!');
        this.close(true);
      },
      error: err => {
        this.notify.showError('Xóa thất bại: ' + (err.error?.message || err.message));
        this.actionLoading = false;
      }
    });
  }

  onApprove(): void {
    this.actionLoading = true;
    this.gcService.approval([this.groupCategoryId]).subscribe({
      next: () => {
        this.notify.showSuccess('Phê duyệt thành công!');
        this.close(true);
      },
      error: err => {
        this.notify.showError('Phê duyệt thất bại: ' + (err.error?.message || err.message));
        this.actionLoading = false;
      }
    });
  }

  onShowReject(): void {
    this.showRejectInput = true;
  }

  onCancelReject(): void {
    this.showRejectInput = false;
    this.rejectReason = '';
  }

  onConfirmReject(): void {
    if (!this.rejectReason.trim()) {
      this.notify.showWarning('Vui lòng nhập lý do từ chối.');
      return;
    }
    this.actionLoading = true;
    this.gcService.reject([this.groupCategoryId], this.rejectReason).subscribe({
      next: () => {
        this.notify.showSuccess('Từ chối bản ghi thành công!');
        this.close(true);
      },
      error: err => {
        this.notify.showError('Từ chối thất bại: ' + (err.error?.message || err.message));
        this.actionLoading = false;
      }
    });
  }

  onCancelApproval(): void {
    if (!confirm('Bạn có chắc chắn muốn hủy phê duyệt bản ghi này?')) return;
    this.actionLoading = true;
    this.gcService.cancelApproval([this.groupCategoryId]).subscribe({
      next: () => {
        this.notify.showSuccess('Hủy phê duyệt thành công!');
        this.close(true);
      },
      error: err => {
        this.notify.showError('Hủy phê duyệt thất bại: ' + (err.error?.message || err.message));
        this.actionLoading = false;
      }
    });
  }

  close(reload: boolean): void {
    this.closed.emit(reload);
  }
}
