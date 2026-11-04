package com.pmh.security;

import com.pmh.model.entity.Users;
import com.pmh.repository.UsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UsersRepository usersRepository;

    @Override
    public UserDetails loadUserByUsername(String username) {
        Users user = usersRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .disabled(!"Y".equals(user.getEnabled()))
                .authorities(user.getRoles() != null
                        ? user.getRoles().stream()
                        .map(r -> {
                            String code = r.getRoleCode();
                            return new SimpleGrantedAuthority(code.startsWith("ROLE_") ? code : "ROLE_" + code);
                        })
                        .collect(Collectors.toList())
                        : java.util.Collections.emptyList())
                .build();
    }
}