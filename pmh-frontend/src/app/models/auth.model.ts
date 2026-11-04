export interface LoginRequest {
  username: string;
  password?: string;
}

export interface RegisterRequest {
  username: string;
  password?: string;
  email: string;
  fullName: string;
}

export interface RoleDTO {
  roleCode: string;
  roleName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  username?: string;
  fullName?: string;
  roles?: RoleDTO[];
}

export interface UserInfo {
  username: string;
  fullName?: string;
  email?: string;
  roles?: RoleDTO[];
}
