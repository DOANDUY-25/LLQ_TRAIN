import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef, GridApi, GridReadyEvent, RowDoubleClickedEvent, SelectionChangedEvent } from 'ag-grid-community';
import {
  GroupCategory,
  GroupCategorySearchDTO,
  GroupCategoryStatus,
  GroupCategoryStatusLabels,
  GroupCategoryStatusColors,
  GroupCategoryActionConfig,
  SelectOption
} from '../../../models/group-category.model';
import { GroupCategoryService } from '../../../core/services/group-category.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-group-category-list',
  templateUrl: './group-category-list.component.html',
  styleUrls: ['./group-category-list.component.css']
})
export class GroupCategoryListComponent implements OnInit {
  items: GroupCategory[] = [];
  selected: GroupCategory[] = [];
  Math = Math;

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  filter: GroupCategorySearchDTO = {};

  statusOptions: SelectOption[] = [
    { value: GroupCategoryStatus.NEW,       label: GroupCategoryStatusLabels[GroupCategoryStatus.NEW] },
    { value: GroupCategoryStatus.PENDING,   label: GroupCategoryStatusLabels[GroupCategoryStatus.PENDING] },
    { value: GroupCategoryStatus.APPROVED,  label: GroupCategoryStatusLabels[GroupCategoryStatus.APPROVED] },
    { value: GroupCategoryStatus.REJECTED,  label: GroupCategoryStatusLabels[GroupCategoryStatus.REJECTED] },
    { value: GroupCategoryStatus.CANCELLED, label: GroupCategoryStatusLabels[GroupCategoryStatus.CANCELLED] }
  ];
  isActiveOptions: SelectOption[] = [
    { value: 0, label: 'Không hoạt động' },
    { value: 1, label: 'Hoạt động' }
  ];
  paramTypeOptions: string[] = [];

  loading = false;
  currentUserRoles: string[] = [];

  showModal = false;
  modalId?: number;

  showBulkRejectDialog = false;
  bulkRejectReason = '';
  bulkRejectLoading = false;

  showBulkApproveConfirm = false;
  bulkApproveLoading = false;

  showBulkCancelConfirm = false;
  bulkCancelLoading = false;

  // AG Grid
  gridApi!: GridApi<GroupCategory>;
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    suppressMovable: false
  };
  columnDefs: ColDef<GroupCategory>[] = [];

  constructor(
    private gcService: GroupCategoryService,
    private router: Router,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.initColumnDefs();
    this.loadRoles();
    this.loadList();
    this.loadParamTypes();
  }

  // ─── AG Grid Setup ─────────────────────────────────────────────────────────

  private initColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: '',
        width: 48,
        minWidth: 48,
        maxWidth: 48,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
        pinned: 'left',
        resizable: false,
        sortable: false,
        cellRenderer: () => ''
      },
      {
        headerName: 'STT',
        width: 65,
        minWidth: 60,
        maxWidth: 70,
        pinned: 'left',
        sortable: false,
        resizable: false,
        cellStyle: { display: 'flex', justifyContent: 'center' },
        valueGetter: (params) => {
          if (!params.node) return '';
          return (this.currentPage * this.pageSize) + (params.node.rowIndex ?? 0) + 1;
        }
      },
      {
        headerName: 'Danh mục theo nhóm',
        field: 'paramType',
        minWidth: 160,
        pinned: 'left',
        cellRenderer: (params: any) => {
          if (!params.value) return '-';
          return `<span class="ag-cell-code" title="Double click để xem chi tiết">${params.value}</span>`;
        }
      },
      {
        headerName: 'Giá trị thành phần',
        field: 'paramValue',
        minWidth: 140
      },
      {
        headerName: 'Tên / Mô tả',
        field: 'paramName',
        minWidth: 180,
        flex: 1
      },
      {
        headerName: 'Ngày hiệu lực',
        field: 'effectiveDate',
        minWidth: 125,
        valueFormatter: (params) => this.formatDate(params.value)
      },
      {
        headerName: 'Ngày hết HLực',
        field: 'endEffectiveDate',
        minWidth: 125,
        valueFormatter: (params) => this.formatDate(params.value)
      },
      {
        headerName: 'Trạng thái',
        field: 'status',
        minWidth: 135,
        cellRenderer: (params: any) => {
          const status = params.value as GroupCategoryStatus;
          if (!status) return '-';
          const label = this.getStatusLabel(status);
          let badgeClass = 'badge-new';
          switch (status) {
            case GroupCategoryStatus.NEW: badgeClass = 'badge-new'; break;
            case GroupCategoryStatus.PENDING: badgeClass = 'badge-pending'; break;
            case GroupCategoryStatus.APPROVED: badgeClass = 'badge-approved'; break;
            case GroupCategoryStatus.REJECTED: badgeClass = 'badge-rejected'; break;
            case GroupCategoryStatus.CANCELLED: badgeClass = 'badge-cancelled'; break;
          }
          return `<span class="ag-cell-badge ${badgeClass}">${label}</span>`;
        }
      },
      {
        headerName: 'Hoạt động',
        field: 'isActive',
        minWidth: 135,
        cellRenderer: (params: any) => {
          return params.value === 1
            ? `<span class="ag-cell-badge badge-active">Hoạt động</span>`
            : `<span class="ag-cell-badge badge-inactive">Không hoạt động</span>`;
        }
      },
      {
        headerName: 'Thao tác',
        minWidth: 200,
        pinned: 'right',
        sortable: false,
        cellRenderer: (params: any) => {
          const data = params.data;
          if (!data) return '';
          const cfg = this.getActionConfig(data);
          let html = `<div class="ag-actions-container">`;

          html += `<button type="button" class="ag-btn-icon btn-view" data-action="view" title="Xem chi tiết">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>`;

          if (cfg.canEdit) {
            html += `<button type="button" class="ag-btn-icon btn-edit" data-action="edit" title="Chỉnh sửa">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>`;
          }

          if (cfg.canClone) {
            html += `<button type="button" class="ag-btn-icon btn-clone" data-action="clone" title="Nhân bản">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>`;
          }

          if (cfg.canSubmit) {
            html += `<button type="button" class="ag-btn-icon btn-submit" data-action="submit" title="Gửi duyệt">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>`;
          }

          if (cfg.canApprove) {
            html += `<button type="button" class="ag-btn-icon btn-approve" data-action="approve" title="Phê duyệt">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </button>`;
          }

          if (cfg.canReject) {
            html += `<button type="button" class="ag-btn-icon btn-reject" data-action="reject" title="Từ chối">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </button>`;
          }

          if (cfg.canCancel) {
            html += `<button type="button" class="ag-btn-icon btn-reject" data-action="cancel" title="Hủy duyệt">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>`;
          }

          html += `<button type="button" class="ag-btn-icon btn-history" data-action="history" title="Lịch sử">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>`;

          if (cfg.canDelete) {
            html += `<button type="button" class="ag-btn-icon btn-delete" data-action="delete" title="Xóa">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>`;
          }

          html += `</div>`;
          return html;
        },
        onCellClicked: (params: any) => {
          const target = (params.event?.target as HTMLElement)?.closest('button');
          if (!target || !params.data) return;
          const action = target.getAttribute('data-action');
          if (!action) return;
          params.event?.stopPropagation();
          this.handleAction(action, params.data);
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent<GroupCategory>): void {
    this.gridApi = params.api;
  }

  onSelectionChanged(event: SelectionChangedEvent<GroupCategory>): void {
    if (this.gridApi) {
      this.selected = this.gridApi.getSelectedRows();
    }
  }

  onRowDoubleClicked(event: RowDoubleClickedEvent<GroupCategory>): void {
    if (event.data) {
      this.onViewDetail(event.data);
    }
  }

  handleAction(action: string, item: GroupCategory): void {
    switch (action) {
      case 'view': this.onViewDetail(item); break;
      case 'edit': this.onEdit(item); break;
      case 'clone': this.onClone(item); break;
      case 'submit': this.onRowSubmit(item); break;
      case 'approve': this.onRowApprove(item); break;
      case 'reject': this.onRowReject(item); break;
      case 'cancel': this.onRowCancel(item); break;
      case 'history': this.onHistory(item); break;
      case 'delete': this.onRowDelete(item); break;
    }
  }

  formatDate(val: any): string {
    if (!val) return '-';
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('vi-VN');
  }

  // ─── Load ──────────────────────────────────────────────────────────────────

  loadList(): void {
    this.loading = true;
    this.gcService.search(this.filter, this.currentPage, this.pageSize).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.items = res.data.content;
          this.totalElements = res.data.totalElements;
          this.totalPages = res.data.totalPages;
        }
        this.loading = false;
      },
      error: err => {
        console.error('Lỗi tải danh sách:', err);
        this.loading = false;
      }
    });
  }

  loadParamTypes(): void {
    this.gcService.getDistinctParamTypes().subscribe({
      next: res => { if (res.success) this.paramTypeOptions = res.data ?? []; }
    });
  }

  loadRoles(): void {
    try {
      const stored = localStorage.getItem('user_info');
      if (stored) {
        const userInfo = JSON.parse(stored);
        this.currentUserRoles = userInfo.roles?.map((r: any) => 
          typeof r === 'string' ? r : r.roleCode
        ) ?? [];
      }
    } catch { 
      this.currentUserRoles = []; 
    }
  }

  // ─── Search ────────────────────────────────────────────────────────────────

  onSearch(): void {
    this.currentPage = 0;
    this.loadList();
  }

  onResetFilter(): void {
    this.filter = {};
    this.onSearch();
  }

  onPageChange(page: number): void {
    if (page < 0 || (this.totalPages > 0 && page >= this.totalPages)) return;
    this.currentPage = page;
    this.loadList();
  }

  onPageSizeChange(size: any): void {
    this.pageSize = Number(size);
    this.currentPage = 0;
    this.loadList();
  }

  // ─── Role helpers ──────────────────────────────────────────────────────────

  hasRole(role: string): boolean {
    return this.currentUserRoles.some(r =>
      r === role || r === `ROLE_${role}` || r.replace('ROLE_', '') === role
    ) || this.currentUserRoles.some(r => r === 'ADMIN' || r === 'ROLE_ADMIN');
  }

  // ─── Status helpers ────────────────────────────────────────────────────────

  getStatusLabel(s: GroupCategoryStatus): string {
    return GroupCategoryStatusLabels[s] ?? 'Không xác định';
  }

  getStatusColor(s: GroupCategoryStatus): string {
    return GroupCategoryStatusColors[s] ?? 'secondary';
  }

  // ─── Action config per row ─────────────────────────────────────────────────

  getActionConfig(item: GroupCategory): GroupCategoryActionConfig {
    const s = item.status;
    const isMaker   = this.hasRole('MAKER');
    const isChecker = this.hasRole('CHECKER');
    const editable  = s === GroupCategoryStatus.NEW
                   || s === GroupCategoryStatus.REJECTED
                   || s === GroupCategoryStatus.CANCELLED;
    return {
      canView:    true,
      canClone:   true,
      canEdit:    editable && isMaker,
      canDelete:  s === GroupCategoryStatus.NEW && item.isDisplay === 1 && isMaker,
      canSubmit:  editable && isMaker,
      canApprove: s === GroupCategoryStatus.PENDING && isChecker,
      canReject:  s === GroupCategoryStatus.PENDING && isChecker,
      canCancel:  s === GroupCategoryStatus.APPROVED && isChecker,
      canHistory: true
    };
  }

  // ─── Bulk action eligibility ───────────────────────────────────────────────

  canBulkSubmit(): boolean {
    return this.selected.length > 0 && this.hasRole('MAKER') &&
      this.selected.every(c =>
        c.status === GroupCategoryStatus.NEW ||
        c.status === GroupCategoryStatus.REJECTED ||
        c.status === GroupCategoryStatus.CANCELLED
      );
  }

  canBulkApprove(): boolean {
    return this.selected.length > 0 && this.hasRole('CHECKER') &&
      this.selected.every(c => c.status === GroupCategoryStatus.PENDING);
  }

  canBulkReject(): boolean {
    return this.selected.length > 0 && this.hasRole('CHECKER') &&
      this.selected.every(c => c.status === GroupCategoryStatus.PENDING);
  }

  canBulkCancel(): boolean {
    return this.selected.length > 0 && this.hasRole('CHECKER') &&
      this.selected.every(c => c.status === GroupCategoryStatus.APPROVED);
  }

  // ─── Row navigation ────────────────────────────────────────────────────────

  onCreate(): void { this.router.navigate(['/group-categories/create']); }

  onViewDetail(item: GroupCategory): void {
    this.modalId = item.id;
    this.showModal = true;
  }

  onEdit(item: GroupCategory): void {
    this.router.navigate(['/group-categories', item.id, 'edit']);
  }

  onClone(item: GroupCategory): void {
    this.router.navigate(['/group-categories', item.id, 'clone']);
  }

  onHistory(item: GroupCategory): void {
    this.router.navigate(['/group-categories', item.id, 'history']);
  }

  onModalClosed(reload: boolean): void {
    this.showModal = false;
    this.modalId = undefined;
    if (reload) { this.selected = []; this.loadList(); }
  }

  onRowDelete(item: GroupCategory): void {
    if (!confirm(`Xóa "${item.paramName}"?`)) return;
    this.gcService.delete(item.id).subscribe({
      next: res => { if (res.success) { this.notify.showSuccess('Xóa thành công!'); this.loadList(); } },
      error: err => this.notify.showError('Lỗi: ' + (err.error?.message || err.message))
    });
  }

  onRowSubmit(item: GroupCategory): void {
    this.gcService.submitApproval([item.id]).subscribe({
      next: res => { if (res.success) { this.notify.showSuccess('Gửi duyệt thành công!'); this.loadList(); } },
      error: err => this.notify.showError('Lỗi: ' + (err.error?.message || err.message))
    });
  }

  onRowApprove(item: GroupCategory): void {
    if (!confirm(`Phê duyệt "${item.paramName}"?`)) return;
    this.gcService.approval([item.id]).subscribe({
      next: res => { if (res.success) { this.notify.showSuccess('Phê duyệt thành công!'); this.loadList(); } },
      error: err => this.notify.showError('Lỗi: ' + (err.error?.message || err.message))
    });
  }

  onRowReject(item: GroupCategory): void {
    const reason = prompt('Nhập lý do từ chối:');
    if (!reason) return;
    this.gcService.reject([item.id], reason).subscribe({
      next: res => { if (res.success) { this.notify.showSuccess('Từ chối thành công!'); this.loadList(); } },
      error: err => this.notify.showError('Lỗi: ' + (err.error?.message || err.message))
    });
  }

  onRowCancel(item: GroupCategory): void {
    if (!confirm(`Hủy duyệt "${item.paramName}"?`)) return;
    this.gcService.cancelApproval([item.id]).subscribe({
      next: res => { if (res.success) { this.notify.showSuccess('Hủy duyệt thành công!'); this.loadList(); } },
      error: err => this.notify.showError('Lỗi: ' + (err.error?.message || err.message))
    });
  }

  bulkSubmit(): void {
    const ids = this.selected.map(c => c.id);
    this.gcService.submitApproval(ids).subscribe({
      next: res => {
        if (res.success) { this.notify.showSuccess(`Gửi duyệt ${ids.length} bản ghi thành công!`); this.selected = []; this.loadList(); }
      },
      error: err => this.notify.showError('Lỗi gửi duyệt: ' + (err.error?.message || err.message))
    });
  }

  openBulkApproveConfirm(): void  { this.showBulkApproveConfirm = true; }
  closeBulkApproveConfirm(): void { this.showBulkApproveConfirm = false; }

  confirmBulkApprove(): void {
    this.bulkApproveLoading = true;
    const ids = this.selected.map(c => c.id);
    this.gcService.approval(ids).subscribe({
      next: () => {
        this.notify.showSuccess(`Phê duyệt ${ids.length} bản ghi thành công!`);
        this.selected = []; this.showBulkApproveConfirm = false;
        this.bulkApproveLoading = false; this.loadList();
      },
      error: err => {
        this.notify.showError('Lỗi: ' + (err.error?.message || err.message));
        this.bulkApproveLoading = false;
      }
    });
  }

  openBulkRejectDialog(): void  { this.showBulkRejectDialog = true; this.bulkRejectReason = ''; }
  closeBulkRejectDialog(): void { this.showBulkRejectDialog = false; this.bulkRejectReason = ''; }

  confirmBulkReject(): void {
    if (!this.bulkRejectReason.trim()) { this.notify.showWarning('Vui lòng nhập lý do từ chối.'); return; }
    this.bulkRejectLoading = true;
    const ids = this.selected.map(c => c.id);
    this.gcService.reject(ids, this.bulkRejectReason).subscribe({
      next: () => {
        this.notify.showSuccess(`Từ chối ${ids.length} bản ghi thành công!`);
        this.selected = []; this.showBulkRejectDialog = false;
        this.bulkRejectLoading = false; this.loadList();
      },
      error: err => {
        this.notify.showError('Lỗi: ' + (err.error?.message || err.message));
        this.bulkRejectLoading = false;
      }
    });
  }

  openBulkCancelConfirm(): void  { this.showBulkCancelConfirm = true; }
  closeBulkCancelConfirm(): void { this.showBulkCancelConfirm = false; }

  confirmBulkCancel(): void {
    this.bulkCancelLoading = true;
    const ids = this.selected.map(c => c.id);
    this.gcService.cancelApproval(ids).subscribe({
      next: () => {
        this.notify.showSuccess(`Hủy duyệt ${ids.length} bản ghi thành công!`);
        this.selected = []; this.showBulkCancelConfirm = false;
        this.bulkCancelLoading = false; this.loadList();
      },
      error: err => {
        this.notify.showError('Lỗi: ' + (err.error?.message || err.message));
        this.bulkCancelLoading = false;
      }
    });
  }
}
