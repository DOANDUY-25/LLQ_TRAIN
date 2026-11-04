import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, tap, throwError } from "rxjs";
import { Router } from "@angular/router";
import { environment } from "../../../environments/environment";
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UserInfo,
} from "../../models/auth.model";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;

  private currentUserSubject = new BehaviorSubject<UserInfo | null>(
    this.getStoredUser(),
  );
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) { }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap((response) => {
        this.saveAuthData(response, request.username);
      }),
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, request)
      .pipe(
        tap((response) => {
          this.saveAuthData(response, request.username);
        }),
      );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }).subscribe({
        error: (err) => console.error("Logout error on server", err),
      });
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_info");
    this.currentUserSubject.next(null);
    this.router.navigate(["/login"]);
  }

  getToken(): string | null {
    return localStorage.getItem("access_token");
  }

  getRefreshToken(): string | null {
    return localStorage.getItem("refresh_token");
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error("Không có refresh token"));
    }

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(
        tap((response) => {
          const username =
            this.getCurrentUser()?.username || response.username || "";
          this.saveAuthData(response, username);
        }),
      );
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false;
      return Date.now() >= payload.exp * 1000 - 30000; // hết hạn trước 30s
    } catch {
      return true;
    }
  }

  isLoggedIn(): boolean {
    return (
      !!this.getToken() && (!!this.getRefreshToken() || !this.isTokenExpired())
    );
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  private saveAuthData(authData: AuthResponse, username: string): void {
    localStorage.setItem("access_token", authData.accessToken);
    localStorage.setItem("refresh_token", authData.refreshToken);

    const userInfo: UserInfo = {
      username: authData.username || username,
      fullName: authData.fullName || authData.username || username,
      roles: authData.roles || [],
    };

    localStorage.setItem("user_info", JSON.stringify(userInfo));
    this.currentUserSubject.next(userInfo);
  }

  private getStoredUser(): UserInfo | null {
    const stored = localStorage.getItem("user_info");
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
}
