import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { GroupCategoryRequestDTO } from '../../../models/group-category.model';
import { GroupCategoryService } from '../../../core/services/group-category.service';
import { GroupCategoryFormComponent } from '../../../shared/components/group-category-form/group-category-form.component';

@Component({
  selector: 'app-group-category-create',
  templateUrl: './group-category-create.component.html',
  styleUrls: ['./group-category-create.component.scss']
})
export class GroupCategoryCreateComponent {
  @ViewChild('formRef') formRef!: GroupCategoryFormComponent;
  loading = false;

  constructor(
    private gcService: GroupCategoryService,
    private router: Router
  ) {}

  onSave(): void { this.formRef?.triggerSubmit(false); }
  onSaveAndSubmit(): void { this.formRef?.triggerSubmit(true); }

  onFormSubmit(dto: GroupCategoryRequestDTO): void {
    this.loading = true;
    this.gcService.create(dto).subscribe({
      next: res => {
        if (res.success) { alert('Thêm mới thành công!'); this.router.navigate(['/group-categories']); }
        this.loading = false;
      },
      error: err => { alert('Lỗi: ' + (err.error?.message || err.message)); this.loading = false; }
    });
  }

  onFormSubmitAndApprove(dto: GroupCategoryRequestDTO): void {
    this.loading = true;
    this.gcService.create(dto).subscribe({
      next: res => {
        if (res.success && res.data?.id) {
          this.gcService.submitApproval([res.data.id]).subscribe({
            next: () => { alert('Thêm mới và gửi duyệt thành công!'); this.router.navigate(['/group-categories']); this.loading = false; },
            error: err => { alert('Đã lưu nhưng gửi duyệt thất bại: ' + (err.error?.message || err.message)); this.router.navigate(['/group-categories']); this.loading = false; }
          });
        } else { this.loading = false; }
      },
      error: err => { alert('Lỗi: ' + (err.error?.message || err.message)); this.loading = false; }
    });
  }

  onCancel(): void { this.router.navigate(['/group-categories']); }
}
