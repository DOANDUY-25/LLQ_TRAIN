import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ComponentRequestDTO, ComponentCloneDTO } from '../../../models/component.model';
import { ComponentService } from '../../../core/services/component.service';
import { ComponentFormComponent } from '../../../shared/components/component-form/component-form.component';

@Component({
  selector: 'app-component-clone',
  templateUrl: './component-clone.component.html',
  styleUrls: ['./component-clone.component.css']
})
export class ComponentCloneComponent implements OnInit {
  @ViewChild('componentFormRef') componentFormRef!: ComponentFormComponent;

  sourceId!: number;
  initialData?: ComponentRequestDTO;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private componentService: ComponentService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.sourceId = +params['id'];
      this.loadSourceComponent();
    });
  }

  loadSourceComponent(): void {
    this.loading = true;
    this.componentService.getDetail(this.sourceId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const source = response.data.newData || response.data.currentData;
          this.initialData = {
            componentCode: '',  // Mã mới do người dùng nhập
            componentName: source.componentName,
            messageType: source.messageType,
            connectionMethod: source.connectionMethod,
            checkToken: source.checkToken,
            effectiveDate: source.effectiveDate,
            endEffectiveDate: source.endEffectiveDate,
            description: source.description
          };
        }
        this.loading = false;
      },
      error: (error) => {
        alert('Không thể tải dữ liệu nguồn: ' + (error.error?.message || error.message));
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
    this.componentService.clone(this.sourceId, dto).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Sao chép cấu phần thành công!');
          this.router.navigate(['/components']);
        }
        this.loading = false;
      },
      error: (error) => {
        alert('Lỗi khi sao chép: ' + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  onFormSubmitAndApprove(dto: ComponentRequestDTO): void {
    this.loading = true;
    this.componentService.clone(this.sourceId, dto).subscribe({
      next: (response) => {
        if (response.success && response.data?.id) {
          this.componentService.submitApproval([response.data.id]).subscribe({
            next: () => {
              alert('Sao chép và gửi duyệt thành công!');
              this.router.navigate(['/components']);
              this.loading = false;
            },
            error: (err) => {
              alert('Đã sao chép nhưng gửi duyệt thất bại: ' + (err.error?.message || err.message));
              this.router.navigate(['/components']);
              this.loading = false;
            }
          });
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        alert('Lỗi khi sao chép: ' + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  onFormCancel(): void {
    this.router.navigate(['/components', this.sourceId]);
  }
}
