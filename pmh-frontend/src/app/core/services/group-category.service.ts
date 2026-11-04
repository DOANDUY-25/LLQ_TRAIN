import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  GroupCategory,
  GroupCategoryRequestDTO,
  GroupCategorySearchDTO,
  GroupCategoryDetailResponseDTO,
  ApiResponse,
  PageResponse,
  AuditLog
} from '../../models/group-category.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GroupCategoryService {

  private readonly apiUrl = `${environment.apiUrl}/api/group-categories`;

  constructor(private http: HttpClient) { }


  search(
    filter: GroupCategorySearchDTO = {},
    page = 0,
    size = 10
  ): Observable<ApiResponse<PageResponse<GroupCategory>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'updatedDate,desc');

    const searchPayload: GroupCategorySearchDTO = {
      ...filter,
      page,
      size
    };

    return this.http.post<ApiResponse<PageResponse<GroupCategory>>>(
      `${this.apiUrl}/search`, searchPayload, { params }
    );
  }

  getDistinctParamTypes(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/distinct-param-types`);
  }

  getDistinctComponentCodes(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/distinct-component-codes`);
  }


  getDetail(id: number): Observable<ApiResponse<GroupCategoryDetailResponseDTO>> {
    return this.http.get<ApiResponse<GroupCategoryDetailResponseDTO>>(`${this.apiUrl}/${id}`);
  }

  create(dto: GroupCategoryRequestDTO): Observable<ApiResponse<GroupCategory>> {
    return this.http.post<ApiResponse<GroupCategory>>(this.apiUrl, dto);
  }

  update(id: number, dto: GroupCategoryRequestDTO): Observable<ApiResponse<GroupCategory>> {
    return this.http.put<ApiResponse<GroupCategory>>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  clone(sourceId: number, dto: GroupCategoryRequestDTO): Observable<ApiResponse<GroupCategory>> {
    return this.http.post<ApiResponse<GroupCategory>>(`${this.apiUrl}/${sourceId}/clone`, dto);
  }

  // Approval workflow 

  submitApproval(ids: number[]): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/submit-approval`, ids);
  }

  approval(ids: number[]): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/approval`, ids);
  }

  /** Từ chối — gửi cả lý do */
  reject(ids: number[], reason = ''): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/reject`, { ids, reason });
  }

  cancelApproval(ids: number[]): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/cancel-approval`, ids);
  }

  // History 

  getHistory(id: number, page = 0, size = 10): Observable<ApiResponse<PageResponse<AuditLog>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'actionDate,desc');

    return this.http.get<ApiResponse<PageResponse<AuditLog>>>(
      `${this.apiUrl}/${id}/history`, { params }
    );
  }
}
