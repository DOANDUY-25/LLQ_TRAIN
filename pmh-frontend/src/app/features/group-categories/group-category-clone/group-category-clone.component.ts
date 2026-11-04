import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupCategoryRequestDTO } from '../../../models/group-category.model';
import { GroupCategoryService } from '../../../core/services/group-category.service';
import { GroupCategoryFormComponent } from '../../../shared/components/group-category-form/group-category-form.component';

@Component({
  selector: 'app-group-category-clone',
  templateUrl: './group-category-clone.component.html',
  styleUrls: ['./group-category-clone.component.scss']
})
export class GroupCategoryCloneComponent implements OnInit {
  @ViewChild('formRef') formRef!: GroupCategoryFormComponent;

  sourceId!: number;
  initialData?: GroupCategoryRequestDTO;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gcService: GroupCategoryService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(p => { this.sourceId = +p['id']; this.loadSource(); });
  }

  loadSource(): void {
    this.loading = true;
    this.gcService.getDetail(this.sourceId).subscribe({
      next: res => {
        if (res.success && res.data) {
          const source = res.data.newData || res.data.currentData;
          // Kế thừa toàn bộ dữ liệu, cho người dùng chỉnh lại nếu cần
          this.initialData = {
            paramName: source.paramName,
            paramValue: source.paramValue,
            paramType: source.paramType,
            description: source.description,
            componentCode: source.componentCode,
            effectiveDate: source.effectiveDate,
            endEffectiveDate: source.endEffectiveDate
          };
        }
        this.loading = false;
      },
      error: err => { alert('Không thể tải dữ liệu nguồn: ' + (err.error?.message || err.message)); this.router.navigate(['/group-categories']); }
    });
  }

  onSave(): void { this.formRef?.triggerSubmit(false); }
  onSaveAndSubmit(): void { this.formRef?.triggerSubmit(true); }

  onFormSubmit(dto: GroupCategoryRequestDTO): void {
    this.loading = true;
    this.gcService.clone(this.sourceId, dto).subscribe({
      next: res => {
        if (res.success) { alert('Sao chép thành công!'); this.router.navigate(['/group-categories']); }
        this.loading = false;
      },
      error: err => { alert('Lỗi: ' + (err.error?.message || err.message)); this.loading = false; }
    });
  }

  onFormSubmitAndApprove(dto: GroupCategoryRequestDTO): void {
    this.loading = true;
    this.gcService.clone(this.sourceId, dto).subscribe({
      next: res => {
        if (res.success && res.data?.id) {
          this.gcService.submitApproval([res.data.id]).subscribe({
            next: () => { alert('Sao chép và gửi duyệt thành công!'); this.router.navigate(['/group-categories']); this.loading = false; },
            error: err => { alert('Đã sao chép nhưng gửi duyệt thất bại: ' + (err.error?.message || err.message)); this.router.navigate(['/group-categories']); this.loading = false; }
          });
        } else { this.loading = false; }
      },
      error: err => { alert('Lỗi: ' + (err.error?.message || err.message)); this.loading = false; }
    });
  }

  onCancel(): void { this.router.navigate(['/group-categories']); }
}
