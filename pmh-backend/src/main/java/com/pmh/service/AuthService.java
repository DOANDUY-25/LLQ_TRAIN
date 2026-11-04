package com.pmh.service;

import com.pmh.model.dto.auth.AuthResponse;
import com.pmh.model.dto.auth.LoginRequest;
import com.pmh.model.dto.auth.RegisterRequest;
import com.pmh.model.dto.auth.RoleDTO;
import com.pmh.model.entity.RefreshToken;
import com.pmh.model.entity.Roles;
import com.pmh.model.entity.Users;
import com.pmh.repository.RefreshTokenRepository;
import com.pmh.repository.RolesRepository;
import com.pmh.repository.UsersRepository;
import com.pmh.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UsersRepository usersRepository;
    private final RolesRepository rolesRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        Users user = usersRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        String accessToken = jwtUtils.generateAccessToken(user);

        // Xóa refresh token cũ rồi tạo mới
        refreshTokenRepository.deleteByUser(user);
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setUser(user);
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshTokenRepository.save(refreshToken);

        List<RoleDTO> roleList = user.getRoles() != null
                ? user.getRoles().stream()
                .map(r -> RoleDTO.builder()
                        .roleCode(r.getRoleCode())
                        .roleName(r.getRoleName())
                        .build())
                .toList()
                : Collections.emptyList();

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .username(user.getUsername())
                .fullName(user.getFullName() != null ? user.getFullName() : user.getUsername())
                .roles(roleList)
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (usersRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại trong hệ thống");
        }
        if (usersRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã được sử dụng cho tài khoản khác");
        }

        Users user = new Users();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setEnabled("Y");

        // Gán Role mặc định: ROLE_ADMIN nếu chưa có user nào, ngược lại là ROLE_MAKER
        String defaultRoleCode = usersRepository.count() == 0 ? "ROLE_ADMIN" : "ROLE_MAKER";
        Roles defaultRole = rolesRepository.findByRoleCode(defaultRoleCode)
                .orElseGet(() -> {
                    Roles newRole = new Roles();
                    newRole.setRoleCode(defaultRoleCode);
                    newRole.setRoleName(defaultRoleCode.equals("ROLE_ADMIN") ? "Quản trị viên" : "Người tạo");
                    return rolesRepository.save(newRole);
                });

        Set<Roles> roles = new HashSet<>();
        roles.add(defaultRole);
        user.setRoles(roles);
        usersRepository.save(user);

        String accessToken = jwtUtils.generateAccessToken(user);
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setUser(user);
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshTokenRepository.save(refreshToken);

        List<RoleDTO> roleList = user.getRoles().stream()
                .map(r -> RoleDTO.builder()
                        .roleCode(r.getRoleCode())
                        .roleName(r.getRoleName())
                        .build())
                .toList();

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .username(user.getUsername())
                .fullName(user.getFullName() != null ? user.getFullName() : user.getUsername())
                .roles(roleList)
                .build();
    }

    @Transactional
    public AuthResponse refresh(String refreshTokenStr) {
        RefreshToken token = refreshTokenRepository.findByToken(refreshTokenStr)
                .orElseThrow(() -> new RuntimeException("Refresh token không hợp lệ"));

        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token đã hết hạn");
        }

        Users user = token.getUser();

        // Refresh Token Rotation (RTR): Hủy refresh token cũ và cấp refresh token mới
        refreshTokenRepository.delete(token);
        RefreshToken newRefreshToken = new RefreshToken();
        newRefreshToken.setToken(UUID.randomUUID().toString());
        newRefreshToken.setUser(user);
        newRefreshToken.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshTokenRepository.save(newRefreshToken);

        String accessToken = jwtUtils.generateAccessToken(user);

        List<RoleDTO> roleList = user.getRoles() != null
                ? user.getRoles().stream()
                .map(r -> RoleDTO.builder()
                        .roleCode(r.getRoleCode())
                        .roleName(r.getRoleName())
                        .build())
                .toList()
                : Collections.emptyList();

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(newRefreshToken.getToken())
                .tokenType("Bearer")
                .username(user.getUsername())
                .fullName(user.getFullName() != null ? user.getFullName() : user.getUsername())
                .roles(roleList)
                .build();
    }

    @Transactional
    public void logout(String refreshTokenStr) {
        refreshTokenRepository.deleteByToken(refreshTokenStr);
    }
}
