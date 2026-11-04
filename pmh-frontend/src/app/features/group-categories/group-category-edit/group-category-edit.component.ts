import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupCategoryRequestDTO, GroupCategoryStatus } from '../../../models/group-category.model';
import { GroupCategoryService } from '../../../core/services/group-category.service';
import { GroupCategoryFormComponent } from '../../../shared/components/group-category-form/group-category-form.component';

@Component({
  selector: 'app-group-category-edit',
  templateUrl: './group-category-edit.component.html',
  styleUrls: ['./group-category-edit.component.scss']
})
export class GroupCategoryEditComponent implements OnInit {
  @ViewChild('formRef') formRef!: GroupCategoryFormComponent;

  id!: number;
  initialData?: GroupCategoryRequestDTO;
  currentStatus?: GroupCategoryStatus;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gcService: GroupCategoryService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(p => { this.id = +p['id']; this.loadData(); });
  }

  loadData(): void {
    this.loading = true;
    this.gcService.getDetail(this.id).subscribe({
      next: res => {
        if (res.success && res.data) {
          const cur = res.data.currentData;
          this.currentStatus = cur.status;
          // Hiển thị newData nếu có (sửa chờ duyệt), ngược lại hiển thị currentData
          this.initialData = res.data.newData ?? {
            paramName: cur.paramName, paramValue: cur.paramValue,
            paramType: cur.paramType, description: cur.description,
            componentCode: cur.componentCode,
            effectiveDate: cur.effectiveDate,
            endEffectiveDate: cur.endEffectiveDate
          };
        }
        this.loading = false;
      },
      error: err => { alert('Không thể tải dữ liệu: ' + (err.error?.message || err.message)); this.router.navigate(['/group-categories']); }
    });
  }

  onSave(): void { this.formRef?.triggerSubmit(false); }
  onSaveAndSubmit(): void { this.formRef?.triggerSubmit(true); }

  onFormSubmit(dto: GroupCategoryRequestDTO): void {
    this.loading = true;
    this.gcService.update(this.id, dto).subscribe({
      next: res => {
        if (res.success) { alert('Cập nhật thành công!'); this.router.navigate(['/group-categories']); }
        this.loading = false;
      },
      error: err => { alert('Lỗi: ' + (err.error?.message || err.message)); this.loading = false; }
    });
  }

  onFormSubmitAndApprove(dto: GroupCategoryRequestDTO): void {
    this.loading = true;
    this.gcService.update(this.id, dto).subscribe({
      next: res => {
        if (res.success) {
          this.gcService.submitApproval([this.id]).subscribe({
            next: () => { alert('Lưu và gửi duyệt thành công!'); this.router.navigate(['/group-categories']); this.loading = false; },
            error: err => { alert('Đã lưu nhưng gửi duyệt thất bại: ' + (err.error?.message || err.message)); this.router.navigate(['/group-categories']); this.loading = false; }
          });
        } else { this.loading = false; }
      },
      error: err => { alert('Lỗi: ' + (err.error?.message || err.message)); this.loading = false; }
    });
  }

  onCancel(): void { this.router.navigate(['/group-categories', this.id]); }
}
