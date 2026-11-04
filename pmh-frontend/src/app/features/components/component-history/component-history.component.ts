import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { AuditLog } from '../../../models/component.model';
import { ComponentService } from '../../../core/services/component.service';

@Component({
  selector: 'app-component-history',
  templateUrl: './component-history.component.html',
  styleUrls: ['./component-history.component.css']
})
export class ComponentHistoryComponent implements OnInit {
  componentId!: string;
  historyLogs: AuditLog[] = [];
  loading = false;
  Math = Math;

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // AG Grid
  gridApi!: GridApi<AuditLog>;
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    suppressMovable: false
  };
  columnDefs: ColDef<AuditLog>[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private componentService: ComponentService
  ) {}

  ngOnInit(): void {
    this.initColumnDefs();
    this.route.params.subscribe(params => {
      this.componentId = params['id'];
      this.loadHistory();
    });
  }

  private initColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'Người dùng',
        field: 'performedBy',
        minWidth: 160,
        cellRenderer: (params: any) => {
          const user = params.value || 'Hệ thống';
          const record = params.data?.recordId ? `<span style="font-size: 11px; color: #64748b; margin-left: 6px;">(#${params.data.recordId})</span>` : '';
          return `<strong>${user}</strong>${record}`;
        }
      },
      {
        headerName: 'Ngày thực hiện',
        field: 'actionDate',
        minWidth: 160,
        valueFormatter: (params) => {
          if (!params.value) return '-';
          const d = new Date(params.value);
          return isNaN(d.getTime()) ? String(params.value) : d.toLocaleString('vi-VN');
        }
      },
      {
        headerName: 'Thao tác',
        field: 'action',
        minWidth: 140,
        cellRenderer: (params: any) => {
          const action = params.value || 'Khác';
          let badgeClass = 'badge-new';
          if (action.includes('Thêm') || action.includes('Tạo')) badgeClass = 'badge-approved';
          else if (action.includes('Duyệt') || action.includes('Phê duyệt')) badgeClass = 'badge-approved';
          else if (action.includes('Từ chối') || action.includes('Xóa')) badgeClass = 'badge-rejected';
          else if (action.includes('Sửa')) badgeClass = 'badge-pending';
          return `<span class="ag-cell-badge ${badgeClass}">${action}</span>`;
        }
      },
      {
        headerName: 'IP',
        field: 'ipAddress',
        minWidth: 130,
        valueFormatter: (params) => params.value || '—'
      },
      {
        headerName: 'Nội dung',
        field: 'description',
        minWidth: 240,
        flex: 1
      }
    ];
  }

  onGridReady(params: GridReadyEvent<AuditLog>): void {
    this.gridApi = params.api;
  }

  loadHistory(): void {
    this.loading = true;
    this.componentService.getHistory(this.componentId, this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.historyLogs = response.data.content;
          this.totalElements = response.data.totalElements;
          this.totalPages = response.data.totalPages;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Lỗi khi tải lịch sử:', error);
        this.loading = false;
      }
    });
  }

  onPageChange(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.loadHistory();
  }

  onBack(): void {
    this.router.navigate(['/components']);
  }
}
