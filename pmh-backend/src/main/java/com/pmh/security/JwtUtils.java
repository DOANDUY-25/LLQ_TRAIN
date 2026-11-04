package com.pmh.security;

import com.pmh.model.entity.Roles;
import com.pmh.model.entity.Users;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Date;
import java.util.stream.Collectors;

@Component
public class JwtUtils {

    @Value("${app.jwt.secret:${spring.security.jwt.secret:pmhSecretKeyForJwtTokenMustBeAtLeast256BitsLongForHMACSHA256}}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms:${spring.security.jwt.expiration-ms:1800000}}")
    private long jwtExpirationMs;          // Access token: 30 phút

    @Value("${app.jwt.refresh-expiration-ms:${spring.security.jwt.refresh-expiration-ms:604800000}}")
    private long refreshExpirationMs;      // Refresh token: 7 ngày

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(Users user) {
        return Jwts.builder()
                .subject(user.getUsername())
                .claim("roles", user.getRoles() != null
                        ? user.getRoles().stream().map(Roles::getRoleCode).collect(Collectors.toList())
                        : Collections.emptyList())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}

