import { Injectable, inject } from '@angular/core';
import { TuiAlertService } from '@taiga-ui/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private alerts: TuiAlertService) { }

  showSuccess(message: string, label: string = 'Thành công'): void {
    this.alerts
      .open(message, {
        label,
        appearance: 'positive',
        autoClose: 3500
      })
      .subscribe();
  }

  showError(message: string, label: string = 'Lỗi'): void {
    this.alerts
      .open(message, {
        label,
        appearance: 'negative',
        autoClose: 5000
      })
      .subscribe();
  }

  showWarning(message: string, label: string = 'Cảnh báo'): void {
    this.alerts
      .open(message, {
        label,
        appearance: 'warning',
        autoClose: 4000
      })
      .subscribe();
  }

  showInfo(message: string, label: string = 'Thông tin'): void {
    this.alerts
      .open(message, {
        label,
        appearance: 'info',
        autoClose: 3500
      })
      .subscribe();
  }
}
