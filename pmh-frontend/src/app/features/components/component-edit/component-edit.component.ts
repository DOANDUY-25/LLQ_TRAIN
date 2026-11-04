import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ComponentRequestDTO, Component as ComponentModel, ComponentStatus } from '../../../models/component.model';
import { ComponentService } from '../../../core/services/component.service';
import { ComponentFormComponent } from '../../../shared/components/component-form/component-form.component';

@Component({
  selector: 'app-component-edit',
  templateUrl: './component-edit.component.html',
  styleUrls: ['./component-edit.component.css']
})
export class ComponentEditComponent implements OnInit {
  @ViewChild('componentFormRef') componentFormRef!: ComponentFormComponent;

  componentId!: number;
  initialData?: ComponentRequestDTO;
  currentStatus?: ComponentStatus;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private componentService: ComponentService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.componentId = +params['id'];
      this.loadComponent();
    });
  }

  loadComponent(): void {
    this.loading = true;
    this.componentService.getDetail(this.componentId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const current = response.data.currentData;
          this.currentStatus = current.status;
          // Nếu có newData thì hiển thị newData, ngược lại hiển thị currentData
          this.initialData = response.data.newData ?? {
            componentCode: current.componentCode,
            componentName: current.componentName,
            messageType: current.messageType,
            connectionMethod: current.connectionMethod,
            checkToken: current.checkToken,
            effectiveDate: current.effectiveDate,
            endEffectiveDate: current.endEffectiveDate,
            description: current.description
          };
        }
        this.loading = false;
      },
      error: (error) => {
        alert('Không thể tải dữ liệu: ' + (error.error?.message || error.message));
        this.loading = false;
        this.router.navigate(['/components']);
      }
    });
  }

  onSave(): void {
    this.componentFormRef?.triggerSubmit(false);
  }

  onSaveAndSubmit(): void {
    this.componentFormRef?.triggerSubmit(true);
  }

  onFormSubmit(dto: ComponentRequestDTO): void {
    this.loading = true;
    this.componentService.update(this.componentId, dto).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Cập nhật cấu phần thành công!');
          this.router.navigate(['/components']);
        }
        this.loading = false;
      },
      error: (error) => {
        alert('Lỗi khi cập nhật: ' + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  onFormSubmitAndApprove(dto: ComponentRequestDTO): void {
    this.loading = true;
    this.componentService.update(this.componentId, dto).subscribe({
      next: (response) => {
        if (response.success) {
          this.componentService.submitApproval([this.componentId]).subscribe({
            next: () => {
              alert('Lưu và gửi duyệt thành công!');
              this.router.navigate(['/components']);
              this.loading = false;
            },
            error: (err) => {
              alert('Đã lưu nhưng gửi duyệt thất bại: ' + (err.error?.message || err.message));
              this.router.navigate(['/components']);
              this.loading = false;
            }
          });
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        alert('Lỗi khi cập nhật: ' + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  onFormCancel(): void {
    this.router.navigate(['/components', this.componentId]);
  }
}
