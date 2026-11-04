import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef, GridApi, GridReadyEvent, RowDoubleClickedEvent, SelectionChangedEvent } from 'ag-grid-community';
import { 
  Component as ComponentModel, 
  ComponentSearchDTO, 
  ComponentStatus,
  ComponentStatusLabels,
  ComponentStatusColors,
  SelectOption,
  ComponentActionConfig
} from '../../../models/component.model';
import { ComponentService } from '../../../core/services/component.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-component-list',
  templateUrl: './component-list.component.html',
  styleUrls: ['./component-list.component.css']
})
export class ComponentListComponent implements OnInit {
  components: ComponentModel[] = [];
  selectedComponents: ComponentModel[] = [];
  Math = Math;

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  searchFilter: ComponentSearchDTO = {};
  
  componentCodeOptions: SelectOption[] = [];
  componentNameOptions: SelectOption[] = [];
  statusOptions: SelectOption[] = [
    { value: ComponentStatus.NEW, label: ComponentStatusLabels[ComponentStatus.NEW] },
    { value: ComponentStatus.PENDING, label: ComponentStatusLabels[ComponentStatus.PENDING] },
    { value: ComponentStatus.APPROVED, label: ComponentStatusLabels[ComponentStatus.APPROVED] },
    { value: ComponentStatus.REJECTED, label: ComponentStatusLabels[ComponentStatus.REJECTED] },
    { value: ComponentStatus.CANCELLED, label: ComponentStatusLabels[ComponentStatus.CANCELLED] }
  ];
  isActiveOptions: SelectOption[] = [
    { value: 0, label: 'Không hoạt động' },
    { value: 1, label: 'Hoạt động' }
  ];
  
  loading = false;
  showDetailModal = false;
  modalComponentId?: number;
  currentUserRoles: string[] = [];

  // AG Grid
  gridApi!: GridApi<ComponentModel>;
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    suppressMovable: false
  };
  columnDefs: ColDef<ComponentModel>[] = [];

  constructor(
    private componentService: ComponentService,
    private router: Router,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.initColumnDefs();
    this.loadComponents();
    this.loadFilterOptions();
    this.loadCurrentUserRoles();
  }

  /**
   * Khởi tạo cấu hình các cột cho AG Grid
   */
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
        headerName: 'Mã cấu phần',
        field: 'componentCode',
        minWidth: 140,
        pinned: 'left',
        cellRenderer: (params: any) => {
          if (!params.value) return '-';
          return `<span class="ag-cell-code" title="Double click để xem chi tiết">${params.value}</span>`;
        }
      },
      {
        headerName: 'Tên cấu phần',
        field: 'componentName',
        minWidth: 180,
        flex: 1
      },
      {
        headerName: 'Chuẩn tin điện',
        field: 'messageType',
        minWidth: 130
      },
      {
        headerName: 'Tên kết nối',
        field: 'connectionMethod',
        minWidth: 130
      },
      {
        headerName: 'Token/Ký số',
        field: 'checkToken',
        minWidth: 110,
        cellRenderer: (params: any) => {
          const val = params.value;
          const isCheck = val === '1' || val === 1 || val === 'Y' || val === 'true';
          return isCheck
            ? `<span class="ag-cell-badge badge-approved">Có</span>`
            : `<span class="ag-cell-badge badge-new">Không</span>`;
        }
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
          const status = params.value as ComponentStatus;
          if (!status) return '-';
          const label = this.getStatusLabel(status);
          let badgeClass = 'badge-new';
          switch (status) {
            case ComponentStatus.NEW: badgeClass = 'badge-new'; break;
            case ComponentStatus.PENDING: badgeClass = 'badge-pending'; break;
            case ComponentStatus.APPROVED: badgeClass = 'badge-approved'; break;
            case ComponentStatus.REJECTED: badgeClass = 'badge-rejected'; break;
            case ComponentStatus.CANCELLED: badgeClass = 'badge-cancelled'; break;
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
            html += `<button type="button" class="ag-btn-icon btn-reject" data-action="cancel" title="Hủy bỏ">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>`;
          }

          html += `<button type="button" class="ag-btn-icon btn-history" data-action="history" title="Lịch sử thao tác">
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

  onGridReady(params: GridReadyEvent<ComponentModel>): void {
    this.gridApi = params.api;
  }

  onSelectionChanged(event: SelectionChangedEvent<ComponentModel>): void {
    if (this.gridApi) {
      this.selectedComponents = this.gridApi.getSelectedRows();
    }
  }

  onRowDoubleClicked(event: RowDoubleClickedEvent<ComponentModel>): void {
    if (event.data) {
      this.onViewDetail(event.data);
    }
  }

  handleAction(action: string, component: ComponentModel): void {
    switch (action) {
      case 'view': this.onViewDetail(component); break;
      case 'edit': this.onEdit(component); break;
      case 'clone': this.onClone(component); break;
      case 'submit': this.onSubmit(component); break;
      case 'approve': this.onApprove(component); break;
      case 'reject': this.onReject(component); break;
      case 'cancel': this.onCancel(component); break;
      case 'history': this.onViewHistory(component); break;
      case 'delete': this.onDelete(component); break;
    }
  }

  formatDate(val: any): string {
    if (!val) return '-';
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('vi-VN');
  }

  /**
   * Load danh sách components
   */
  loadComponents(): void {
    this.loading = true;
    
    this.componentService.search(this.searchFilter, this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.components = response.data.content;
            this.totalElements = response.data.totalElements;
            this.totalPages = response.data.totalPages;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Lỗi khi tải danh sách:', error);
          this.loading = false;
        }
      });
  }

  loadFilterOptions(): void {
    this.componentService.getDistinctCodes().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.componentCodeOptions = response.data.map(code => ({
            value: code,
            label: code
          }));
        }
      },
      error: (error) => {
        console.error('Lỗi khi load component codes:', error);
      }
    });

    this.componentService.getDistinctNames().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.componentNameOptions = response.data.map(name => ({
            value: name,
            label: name
          }));
        }
      },
      error: (error) => {
        console.error('Lỗi khi load component names:', error);
      }
    });
  }

  loadCurrentUserRoles(): void {
    const stored = localStorage.getItem('user_info');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        this.currentUserRoles = user.roles?.map((r: any) => 
          typeof r === 'string' ? r : r.roleCode
        ) || [];
      } catch {
        this.currentUserRoles = [];
      }
    }
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadComponents();
  }

  onResetFilter(): void {
    this.searchFilter = {};
    this.onSearch();
  }

  onPageChange(page: number): void {
    if (page < 0 || (this.totalPages > 0 && page >= this.totalPages)) {
      return;
    }
    this.currentPage = page;
    this.loadComponents();
  }

  onPageSizeChange(size: any): void {
    this.pageSize = Number(size);
    this.currentPage = 0;
    this.loadComponents();
  }

  getStatusLabel(status: ComponentStatus): string {
    return ComponentStatusLabels[status] || 'Không xác định';
  }

  getStatusColor(status: ComponentStatus): string {
    return ComponentStatusColors[status] || 'secondary';
  }

  hasRole(role: string): boolean {
    return this.currentUserRoles.some(r =>
      r === role || r === `ROLE_${role}` || r === role.replace('ROLE_', '')
    ) || this.currentUserRoles.some(r => r === 'ADMIN' || r === 'ROLE_ADMIN');
  }

  getActionConfig(component: ComponentModel): ComponentActionConfig {
    const status = component.status;
    const isMaker = this.hasRole('MAKER');
    const isChecker = this.hasRole('CHECKER');
    
    return {
      canClone: true,
      canEdit: (status === ComponentStatus.NEW || status === ComponentStatus.REJECTED || status === ComponentStatus.CANCELLED) && isMaker,
      canDelete: status === ComponentStatus.NEW && component.isDisplay === 1 && isMaker,
      canSubmit: (status === ComponentStatus.NEW || status === ComponentStatus.REJECTED || status === ComponentStatus.CANCELLED) && isMaker,
      canApprove: status === ComponentStatus.PENDING && isChecker,
      canReject: status === ComponentStatus.PENDING && isChecker,
      canCancel: status === ComponentStatus.APPROVED && isChecker
    };
  }

  canBulkAction(action: string): boolean {
    if (this.selectedComponents.length === 0) return false;
    
    switch (action) {
      case 'submit':
        return this.selectedComponents.every(c => 
          (c.status === ComponentStatus.NEW || c.status === ComponentStatus.REJECTED || c.status === ComponentStatus.CANCELLED)
        ) && this.hasRole('MAKER');
      
      case 'approve':
        return this.selectedComponents.every(c => c.status === ComponentStatus.PENDING) && this.hasRole('CHECKER');
      
      case 'reject':
        return this.selectedComponents.every(c => c.status === ComponentStatus.PENDING) && this.hasRole('CHECKER');
      
      case 'cancel':
        return this.selectedComponents.every(c => c.status === ComponentStatus.APPROVED) && this.hasRole('CHECKER');
      
      default:
        return false;
    }
  }

  onCreate(): void {
    this.router.navigate(['/components/create']);
  }

  onViewDetail(component: ComponentModel): void {
    this.modalComponentId = component.id;
    this.showDetailModal = true;
  }

  onModalClosed(reload: boolean): void {
    this.showDetailModal = false;
    this.modalComponentId = undefined;
    if (reload) {
      this.loadComponents();
    }
  }

  onEdit(component: ComponentModel): void {
    this.router.navigate(['/components', component.id, 'edit']);
  }

  onClone(component: ComponentModel): void {
    this.router.navigate(['/components', component.id, 'clone']);
  }

  onDelete(component: ComponentModel): void {
    if (!confirm(`Bạn có chắc chắn muốn xóa cấu phần "${component.componentCode}"?`)) {
      return;
    }

    this.componentService.delete(component.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notify.showSuccess('Xóa thành công!');
          this.loadComponents();
        }
      },
      error: (error) => {
        this.notify.showError('Lỗi khi xóa: ' + (error.error?.message || error.message));
      }
    });
  }

  onSubmit(component: ComponentModel): void {
    this.bulkSubmit([component.id]);
  }

  onApprove(component: ComponentModel): void {
    if (!confirm(`Bạn có chắc chắn muốn phê duyệt cấu phần "${component.componentCode}"?`)) {
      return;
    }
    this.componentService.approval([component.id]).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.showSuccess('Phê duyệt thành công!');
          this.loadComponents();
        }
      },
      error: (err) => this.notify.showError('Lỗi khi phê duyệt: ' + (err.error?.message || err.message))
    });
  }

  onReject(component: ComponentModel): void {
    if (!confirm(`Bạn có chắc chắn muốn từ chối cấu phần "${component.componentCode}"?`)) {
      return;
    }
    this.componentService.reject([component.id]).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.showSuccess('Từ chối thành công!');
          this.loadComponents();
        }
      },
      error: (err) => this.notify.showError('Lỗi khi từ chối: ' + (err.error?.message || err.message))
    });
  }

  onCancel(component: ComponentModel): void {
    if (!confirm(`Bạn có chắc chắn muốn hủy duyệt cấu phần "${component.componentCode}"?`)) {
      return;
    }
    this.componentService.cancelApproval([component.id]).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.showSuccess('Hủy duyệt thành công!');
          this.loadComponents();
        }
      },
      error: (err) => this.notify.showError('Lỗi khi hủy duyệt: ' + (err.error?.message || err.message))
    });
  }

  onViewHistory(component: ComponentModel): void {
    this.router.navigate(['/components', component.id, 'history']);
  }

  bulkSubmit(ids?: number[]): void {
    const targetIds = ids || this.selectedComponents.map(c => c.id);
    
    if (targetIds.length === 0) {
      this.notify.showWarning('Vui lòng chọn ít nhất một bản ghi');
      return;
    }

    this.componentService.submitApproval(targetIds).subscribe({
      next: (response) => {
        if (response.success) {
          this.notify.showSuccess('Gửi duyệt thành công!');
          this.selectedComponents = [];
          this.loadComponents();
        }
      },
      error: (error) => {
        this.notify.showError('Lỗi khi gửi duyệt: ' + (error.error?.message || error.message));
      }
    });
  }

  bulkApprove(): void {
    const ids = this.selectedComponents.map(c => c.id);
    
    if (!confirm(`Bạn có chắc chắn muốn phê duyệt ${ids.length} bản ghi?`)) {
      return;
    }

    this.componentService.approval(ids).subscribe({
      next: (response) => {
        if (response.success) {
          this.notify.showSuccess('Phê duyệt thành công!');
          this.selectedComponents = [];
          this.loadComponents();
        }
      },
      error: (error) => {
        this.notify.showError('Lỗi khi phê duyệt: ' + (error.error?.message || error.message));
      }
    });
  }

  bulkReject(): void {
    const ids = this.selectedComponents.map(c => c.id);
    
    if (!confirm(`Bạn có chắc chắn muốn từ chối ${ids.length} bản ghi?`)) {
      return;
    }

    this.componentService.reject(ids).subscribe({
      next: (response) => {
        if (response.success) {
          this.notify.showSuccess('Từ chối thành công!');
          this.selectedComponents = [];
          this.loadComponents();
        }
      },
      error: (error) => {
        this.notify.showError('Lỗi khi từ chối: ' + (error.error?.message || error.message));
      }
    });
  }

  bulkCancel(): void {
    const ids = this.selectedComponents.map(c => c.id);
    
    if (!confirm(`Bạn có chắc chắn muốn hủy duyệt ${ids.length} bản ghi?`)) {
      return;
    }

    this.componentService.cancelApproval(ids).subscribe({
      next: (response) => {
        if (response.success) {
          this.notify.showSuccess('Hủy duyệt thành công!');
          this.selectedComponents = [];
          this.loadComponents();
        }
      },
      error: (error) => {
        this.notify.showError('Lỗi khi hủy duyệt: ' + (error.error?.message || error.message));
      }
    });
  }

  onExportExcel(): void {
    this.notify.showInfo('Chức năng xuất Excel đang được xử lý');
  }
}
