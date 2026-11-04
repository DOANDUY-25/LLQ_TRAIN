import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { AuditLog } from '../../../models/group-category.model';
import { GroupCategoryService } from '../../../core/services/group-category.service';

@Component({
  selector: 'app-group-category-history',
  templateUrl: './group-category-history.component.html',
  styleUrls: ['./group-category-history.component.scss']
})
export class GroupCategoryHistoryComponent implements OnInit {
  id!: number;
  logs: AuditLog[] = [];
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
    private gcService: GroupCategoryService
  ) {}

  ngOnInit(): void {
    this.initColumnDefs();
    this.route.params.subscribe(p => { this.id = +p['id']; this.loadHistory(); });
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
          const action = (params.value || 'Khác').toUpperCase();
          let badgeClass = 'badge-new';
          if (action.includes('THÊM') || action.includes('TẠO') || action.includes('SAO CHÉP')) badgeClass = 'badge-approved';
          else if (action.includes('DUYỆT') || action.includes('PHÊ DUYỆT')) badgeClass = 'badge-approved';
          else if (action.includes('TỪ CHỐI') || action.includes('XÓA')) badgeClass = 'badge-rejected';
          else if (action.includes('SỬA') || action.includes('CẬP NHẬT')) badgeClass = 'badge-pending';
          return `<span class="ag-cell-badge ${badgeClass}">${params.value}</span>`;
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
    this.gcService.getHistory(this.id, this.currentPage, this.pageSize).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.logs = res.data.content;
          this.totalElements = res.data.totalElements;
          this.totalPages = res.data.totalPages;
        }
        this.loading = false;
      },
      error: err => { console.error(err); this.loading = false; }
    });
  }

  onPageChange(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.loadHistory();
  }

  onBack(): void { this.router.navigate(['/group-categories']); }
}
