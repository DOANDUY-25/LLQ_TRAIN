import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface DiffField {
  key: string;
  label: string;
  isDate?: boolean;
}

@Component({
  selector: 'app-data-diff-modal',
  templateUrl: './data-diff-modal.component.html',
  styleUrls: ['./data-diff-modal.component.css']
})
export class DataDiffModalComponent {
  /**
   * @Input() nhận dữ liệu từ Component CHA truyền vào
   */
  @Input() isOpen = false;
  @Input() title = 'Bảng đối chiếu dữ liệu (Dữ liệu cũ vs Dữ liệu mới đề xuất)';
  @Input() currentData: Record<string, any> = {};
  @Input() newData: Record<string, any> = {};
  @Input() fields: DiffField[] = [];
  @Input() canApprove = false;
  @Input() canReject = false;
  @Input() actionLoading = false;

  /**
   * @Output() phát sự kiện và dữ liệu ngược lên Component CHA
   */
  @Output() close = new EventEmitter<void>();
  @Output() approve = new EventEmitter<void>();
  @Output() reject = new EventEmitter<string>();

  rejectReason = '';
  showRejectInput = false;

  onClose(): void {
    this.showRejectInput = false;
    this.rejectReason = '';
    this.close.emit();
  }

  onApprove(): void {
    this.approve.emit();
  }

  onToggleRejectInput(): void {
    this.showRejectInput = !this.showRejectInput;
  }

  onConfirmReject(): void {
    if (!this.rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    this.reject.emit(this.rejectReason.trim());
  }

  isChanged(key: string): boolean {
    const oldVal = this.currentData ? this.currentData[key] : undefined;
    const newVal = this.newData ? this.newData[key] : undefined;
    if (newVal === undefined || newVal === null) return false;
    return String(oldVal ?? '').trim() !== String(newVal ?? '').trim();
  }

  formatValue(val: any, isDate?: boolean): string {
    if (val === null || val === undefined || val === '') return '—';
    if (isDate) {
      try {
        const d = new Date(val);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch {
        return String(val);
      }
    }
    return String(val);
  }
}
