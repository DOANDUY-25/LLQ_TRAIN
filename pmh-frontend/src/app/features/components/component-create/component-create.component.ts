import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ComponentRequestDTO } from '../../../models/component.model';
import { ComponentService } from '../../../core/services/component.service';
import { ComponentFormComponent } from '../../../shared/components/component-form/component-form.component';

@Component({
  selector: 'app-component-create',
  templateUrl: './component-create.component.html',
  styleUrls: ['./component-create.component.css']
})
export class ComponentCreateComponent {
  @ViewChild('componentFormRef') componentFormRef!: ComponentFormComponent;
  loading = false;

  constructor(
    private componentService: ComponentService,
    private router: Router
  ) {}

  /** Nút "Lưu": trigger form submit (chỉ lưu, không gửi duyệt) */
  onSave(): void {
    this.componentFormRef?.triggerSubmit(false);
  }

  /** Nút "Lưu và gửi duyệt": trigger form submit rồi gửi duyệt */
  onSaveAndSubmit(): void {
    this.componentFormRef?.triggerSubmit(true);
  }

  /** Callback khi form emit lưu (không gửi duyệt) */
  onFormSubmit(dto: ComponentRequestDTO): void {
    this.loading = true;
    this.componentService.create(dto).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccess('Thêm mới cấu phần thành công!');
          this.router.navigate(['/components']);
        }
        this.loading = false;
      },
      error: (error) => {
        this.showError('Lỗi khi thêm mới: ' + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  /** Callback khi form emit lưu và gửi duyệt */
  onFormSubmitAndApprove(dto: ComponentRequestDTO): void {
    this.loading = true;
    this.componentService.create(dto).subscribe({
      next: (response) => {
        if (response.success && response.data?.id) {
          // Sau khi tạo thành công, gửi duyệt luôn
          this.componentService.submitApproval([response.data.id]).subscribe({
            next: (res2) => {
              if (res2.success) {
                this.showSuccess('Thêm mới và gửi duyệt thành công!');
              }
              this.router.navigate(['/components']);
              this.loading = false;
            },
            error: (err) => {
              this.showError('Đã lưu nhưng gửi duyệt thất bại: ' + (err.error?.message || err.message));
              this.router.navigate(['/components']);
              this.loading = false;
            }
          });
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        this.showError('Lỗi khi thêm mới: ' + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  onFormCancel(): void {
    this.router.navigate(['/components']);
  }

  private showSuccess(msg: string): void {
    // TODO: thay bằng toast/snackbar thực sự
    alert(msg);
  }

  private showError(msg: string): void {
    alert(msg);
  }
}
