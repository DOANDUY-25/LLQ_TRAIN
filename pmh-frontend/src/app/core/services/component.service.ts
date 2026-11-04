import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Component,
  ComponentRequestDTO,
  ComponentSearchDTO,
  ComponentDetailResponseDTO,
  ComponentCloneDTO,
  ApiResponse,
  PageResponse,
  AuditLog
} from '../../models/component.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ComponentService {
  private apiUrl = `${environment.apiUrl}/api/components`;

  constructor(private http: HttpClient) { }

  search(filter: ComponentSearchDTO = {}, page: number = 0, size: number = 10): Observable<ApiResponse<PageResponse<Component>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'updatedDate,desc');

    const searchPayload: ComponentSearchDTO = {
      ...filter,
      page,
      size
    };

    return this.http.post<ApiResponse<PageResponse<Component>>>(
      `${this.apiUrl}/search`,
      searchPayload,
      { params }
    );
  }

  getDetail(id: number): Observable<ApiResponse<ComponentDetailResponseDTO>> {
    return this.http.get<ApiResponse<ComponentDetailResponseDTO>>(`${this.apiUrl}/${id}`);
  }


  create(dto: ComponentRequestDTO): Observable<ApiResponse<Component>> {
    return this.http.post<ApiResponse<Component>>(this.apiUrl, dto);
  }


  update(id: number, dto: ComponentRequestDTO): Observable<ApiResponse<Component>> {
    return this.http.put<ApiResponse<Component>>(`${this.apiUrl}/${id}`, dto);
  }


  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }


  clone(id: number, dto: ComponentRequestDTO | ComponentCloneDTO): Observable<ApiResponse<Component>> {
    return this.http.post<ApiResponse<Component>>(`${this.apiUrl}/${id}/clone`, dto);
  }


  submitApproval(ids: number[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/submit-approval`, ids);
  }


  approval(ids: number[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/approval`, ids);
  }


  reject(ids: number[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/reject`, ids);
  }


  cancelApproval(ids: number[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/cancel-approval`, ids);
  }


  getHistory(id: string, page: number = 0, size: number = 10): Observable<ApiResponse<PageResponse<AuditLog>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'actionDate,desc');

    return this.http.get<ApiResponse<PageResponse<AuditLog>>>(
      `${this.apiUrl}/${id}/history`,
      { params }
    );
  }

  /**
   * Lấy danh sách distinct COMPONENT_CODE để filter
   */
  getDistinctCodes(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/distinct-codes`);
  }

  /**
   * Lấy danh sách distinct COMPONENT_NAME để filter
   */
  getDistinctNames(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/distinct-names`);
  }
}
