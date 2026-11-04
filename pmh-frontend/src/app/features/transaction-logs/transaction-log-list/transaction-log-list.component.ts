import { Component, OnInit, OnDestroy } from '@angular/core';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Subscription, interval } from 'rxjs';
import { TransactionLog, TransactionLogSearchDTO, TransactionStatusOptions, ExportNotificationEvent } from '../../../models/transaction-log.model';
import { TransactionLogService } from '../../../services/transaction-log.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-transaction-log-list',
  templateUrl: './transaction-log-list.component.html',
  styleUrls: ['./transaction-log-list.component.css']
})
export class TransactionLogListComponent implements OnInit, OnDestroy {

  // Data
  items: TransactionLog[] = [];
  Math = Math;

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Filter
  filter: TransactionLogSearchDTO = {};
  statusOptions = TransactionStatusOptions;

  // State
  loading = false;
  exporting = false;
  exportProgress = 0;
  exportStatusMessage = '';
  activeExportJobId: string | null = null;
  private exportWsSub?: Subscription;
  private exportPollSub?: Subscription;

  // AG Grid
  gridApi!: GridApi<TransactionLog>;
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    suppressMovable: false
  };
  columnDefs: ColDef<TransactionLog>[] = [];

  constructor(
    private service: TransactionLogService,
    private wsService: WebSocketService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initColumnDefs();
    this.loadList();
  }

  ngOnDestroy(): void {
    this.cleanupExportTracking();
  }

  private initColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'STT',
        width: 65,
        minWidth: 60,
        maxWidth: 70,
        pinned: 'left',
        sortable: false,
        resizable: false,
        valueGetter: (params) => {
          if (!params.node) return '';
          return (this.currentPage * this.pageSize) + (params.node.rowIndex ?? 0) + 1;
        }
      },
      {
        headerName: 'Mã giao dịch',
        field: 'transactionCode',
        minWidth: 160,
        pinned: 'left',
        cellRenderer: (params: any) => {
          if (!params.value) return '-';
          return `<span class="ag-cell-code">${params.value}</span>`;
        }
      },
      {
        headerName: 'Số tài khoản',
        field: 'accountNo',
        minWidth: 140
      },
      {
        headerName: 'Số tiền',
        field: 'amount',
        minWidth: 140,
        cellStyle: { textAlign: 'right', justifyContent: 'flex-end' },
        headerClass: 'ag-right-aligned-header',
        valueFormatter: (params) => this.formatNumber(params.value)
      },
      {
        headerName: 'Trạng thái',
        field: 'status',
        minWidth: 135,
        cellRenderer: (params: any) => {
          const val = params.value;
          if (!val) return '-';
          const label = this.getStatusLabel(val);
          let badgeClass = 'badge-new';
          if (val === 'SUCCESS') badgeClass = 'badge-approved';
          else if (val === 'PENDING') badgeClass = 'badge-pending';
          else if (val === 'FAILED') badgeClass = 'badge-rejected';
          else if (val === 'CANCELLED') badgeClass = 'badge-cancelled';
          return `<span class="ag-cell-badge ${badgeClass}">${label}</span>`;
        }
      },
      {
        headerName: 'Ngày tạo',
        field: 'createdAt',
        minWidth: 160,
        valueFormatter: (params) => this.formatDateTime(params.value)
      },
      {
        headerName: 'Số tham chiếu',
        field: 'referenceNo',
        minWidth: 150
      },
      {
        headerName: 'Mô tả',
        field: 'description',
        minWidth: 200,
        flex: 1
      }
    ];
  }

  onGridReady(params: GridReadyEvent<TransactionLog>): void {
    this.gridApi = params.api;
  }

  // ─── Load Data ─────────────────────────────────────────────────────────────

  loadList(): void {
    this.loading = true;
    this.service.search(this.filter, this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.items = response.data.content || [];
          this.totalElements = response.data.totalElements || 0;
          this.totalPages = response.data.totalPages || 0;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách:', err);
        this.loading = false;
      }
    });
  }

  // ─── Search ────────────────────────────────────────────────────────────────

  onSearch(): void {
    this.currentPage = 0;
    this.loadList();
  }

  onResetFilter(): void {
    this.filter = {};
    this.currentPage = 0;
    this.loadList();
  }

  // ─── Export ────────────────────────────────────────────────────────────────

  onExport(): void {
    if (this.exporting) return;

    this.exporting = true;
    this.exportProgress = 0;
    this.exportStatusMessage = 'Đang tiếp nhận yêu cầu xuất file...';

    const currentUser = this.authService.getCurrentUser()?.username;

    this.service.exportFile(this.filter, currentUser).subscribe({
      next: (response) => {
        const jobId = response?.jobId || response?.data?.jobId;
        if (!jobId) {
          this.exporting = false;
          this.notificationService.showError('Không nhận được mã tiến trình xuất file (Job ID). Vui lòng thử lại.');
          return;
        }

        this.activeExportJobId = jobId;
        this.notificationService.showInfo('Đã tiếp nhận yêu cầu xuất file. Đang tiến hành tạo file...', 'Xuất file');
        this.listenAndTrackExport(jobId);
      },
      error: (err) => {
        console.error('Lỗi khi xuất file:', err);
        this.exporting = false;
        this.exportProgress = 0;
        this.notificationService.showError(err?.error?.message || 'Có lỗi xảy ra khi yêu cầu xuất file');
      }
    });
  }

  private listenAndTrackExport(jobId: string): void {
    let isFinished = false;

    const handleSuccess = (fileUrl?: string) => {
      if (isFinished) return;
      isFinished = true;
      this.cleanupExportTracking();
      this.exportProgress = 100;
      this.exportStatusMessage = 'Xuất file thành công! Đang tải file...';
      this.notificationService.showSuccess('Xuất file thành công! Đang tải file xuống...', 'Thành công');

      this.downloadFile(jobId, fileUrl);

      setTimeout(() => {
        this.exporting = false;
        this.exportProgress = 0;
        this.activeExportJobId = null;
        this.exportStatusMessage = '';
      }, 2500);
    };

    const handleFailure = (errorMsg?: string) => {
      if (isFinished) return;
      isFinished = true;
      this.cleanupExportTracking();
      this.exporting = false;
      this.exportProgress = 0;
      this.activeExportJobId = null;
      this.exportStatusMessage = '';
      this.notificationService.showError('Xuất file thất bại: ' + (errorMsg || 'Đã có lỗi xảy ra trong quá trình xuất file'), 'Lỗi');
    };

    // 1. Lắng nghe thông báo qua WebSocket/STOMP (Redis Pub/Sub -> WebSocket push)
    this.exportWsSub = this.wsService.subscribeExportJob(jobId).subscribe({
      next: (event: ExportNotificationEvent) => {
        if (event.progress != null && event.progress > this.exportProgress) {
          this.exportProgress = event.progress;
          this.exportStatusMessage = `Đang xử lý dữ liệu (${this.exportProgress}%)...`;
        }
        if (event.status === 'SUCCESS') {
          handleSuccess(event.fileUrl);
        } else if (event.status === 'FAILED') {
          handleFailure();
        }
      },
      error: (err) => {
        console.warn('Lỗi kết nối WebSocket export:', err);
      }
    });

    // 2. Polling tiến trình song song (mỗi 1.5 giây) từ Redis/Database để cập nhật % tiến độ và làm dự phòng
    this.exportPollSub = interval(1500).subscribe(() => {
      if (isFinished) return;

      this.service.getExportStatus(jobId).subscribe({
        next: (res) => {
          if (!res || !res.data) return;
          const data = res.data;

          if (data.progress != null && data.progress > this.exportProgress) {
            this.exportProgress = data.progress;
            this.exportStatusMessage = `Đang xử lý dữ liệu (${this.exportProgress}%)...`;
          }

          if (data.status === 'SUCCESS') {
            handleSuccess(data.fileUrl);
          } else if (data.status === 'FAILED') {
            handleFailure(data.errorMessage);
          }
        },
        error: (err) => {
          console.warn('Lỗi kiểm tra tiến độ export:', err);
        }
      });
    });
  }

  private downloadFile(jobId: string, fileUrl?: string): void {
    this.service.downloadExportFile(jobId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transaction_logs_${jobId.substring(0, Math.min(jobId.length, 8))}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.warn('Lỗi tải file qua backend API, thử tải trực tiếp từ MinIO fileUrl:', err);
        if (fileUrl) {
          window.open(fileUrl, '_blank');
        } else {
          this.notificationService.showError('Không thể tự động tải file về máy. Vui lòng thử lại sau.');
        }
      }
    });
  }

  private cleanupExportTracking(): void {
    if (this.exportWsSub) {
      this.exportWsSub.unsubscribe();
      this.exportWsSub = undefined;
    }
    if (this.exportPollSub) {
      this.exportPollSub.unsubscribe();
      this.exportPollSub = undefined;
    }
  }

  // ─── Pagination ────────────────────────────────────────────────────────────

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

  // ─── Helpers ───────────────────────────────────────────────────────────────

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find(o => o.value === status);
    return option ? option.label : status;
  }

  formatNumber(value: number | null | undefined): string {
    if (value == null) return '0';
    return new Intl.NumberFormat('vi-VN').format(value);
  }

  formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN');
  }
}
