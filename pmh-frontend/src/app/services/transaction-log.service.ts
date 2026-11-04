import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TransactionLogSearchDTO } from '../models/transaction-log.model';

@Injectable({
  providedIn: 'root'
})
export class TransactionLogService {
  private apiUrl = `${environment.apiUrl}/api/transaction-logs`;

  constructor(private http: HttpClient) { }

  search(
    searchDTO: TransactionLogSearchDTO,
    page: number = 0,
    size: number = 10,
    sortBy: string = 'createdAt',
    sortDir: string = 'DESC'
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.post<any>(`${this.apiUrl}/search`, searchDTO, { params });
  }

  /**
   * Khởi tạo job xuất file Excel
   */
  exportFile(searchDTO?: TransactionLogSearchDTO, userId?: string): Observable<any> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId);
    }
    return this.http.post<any>(`${this.apiUrl}/export`, searchDTO || {}, { params });
  }

  /**
   * Kiểm tra tiến độ và trạng thái của export job
   */
  getExportStatus(jobId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/export/status/${jobId}`);
  }

  /**
   * Tải file đã xuất về máy dưới dạng Blob
   */
  downloadExportFile(jobId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/download/${jobId}`, {
      responseType: 'blob'
    });
  }

  /**
   * Lấy URL trực tiếp để tải file
   */
  getDownloadUrl(jobId: string): string {
    return `${this.apiUrl}/export/download/${jobId}`;
  }
}
