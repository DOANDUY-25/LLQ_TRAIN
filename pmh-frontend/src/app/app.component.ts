import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { UserInfo } from './models/auth.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'PMH - Quản lý tham số Cấu phần xử lý';
  isAuthPage = false;
  currentUser: UserInfo | null = null;

  constructor(
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      this.isAuthPage = url.includes('/login') || url.includes('/register');
    });

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngAfterViewInit(): void {
    this.updateDate();
  }

  logout(): void {
    this.authService.logout();
  }

  /**
   * Hiển thị chức danh quyền bằng tiếng Anh (ADMIN, MAKER, CHECKER, v.v.)
   */
  getRoleLabel(role: any): string {
    const raw = (typeof role === 'string' ? role : (role?.roleCode || role?.roleName || '')).trim();
    const clean = raw.replace(/^ROLE_/i, '').toUpperCase();
    return clean || 'ADMIN';
  }

  getUserRoles(): string {
    if (!this.currentUser?.roles || this.currentUser.roles.length === 0) {
      return 'ADMIN';
    }
    return this.currentUser.roles
      .map(role => this.getRoleLabel(role))
      .join(' / ');
  }

  private updateDate(): void {
    const el = document.getElementById('topbar-date-display');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleDateString('vi-VN', {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
      });
    }
  }
}
