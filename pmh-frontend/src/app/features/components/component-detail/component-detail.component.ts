import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ComponentDetailResponseDTO, ComponentStatus, ComponentStatusLabels, ComponentStatusColors } from '../../../models/component.model';
import { ComponentService } from '../../../core/services/component.service';

@Component({
  selector: 'app-component-detail',
  templateUrl: './component-detail.component.html',
  styleUrls: ['./component-detail.component.css']
})
export class ComponentDetailComponent implements OnInit {
  componentId!: number;
  detailData?: ComponentDetailResponseDTO;
  loading = false;
  hasNewData = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private componentService: ComponentService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.componentId = +params['id'];
      this.loadDetail();
    });
  }

  loadDetail(): void {
    this.loading = true;
    
    this.componentService.getDetail(this.componentId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.detailData = response.data;
          this.hasNewData = !!this.detailData.newData;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Lỗi khi tải chi tiết:', error);
        alert('Không thể tải chi tiết: ' + (error.error?.message || error.message));
        this.loading = false;
        this.router.navigate(['/components']);
      }
    });
  }

  getStatusLabel(status: ComponentStatus): string {
    return ComponentStatusLabels[status] || 'Không xác định';
  }

  getStatusColor(status: ComponentStatus): string {
    return ComponentStatusColors[status] || 'secondary';
  }

  onBack(): void {
    this.router.navigate(['/components']);
  }

  onEdit(): void {
    this.router.navigate(['/components', this.componentId, 'edit']);
  }

  onClone(): void {
    this.router.navigate(['/components', this.componentId, 'clone']);
  }

  onViewHistory(): void {
    this.router.navigate(['/components', this.componentId, 'history']);
  }
}
