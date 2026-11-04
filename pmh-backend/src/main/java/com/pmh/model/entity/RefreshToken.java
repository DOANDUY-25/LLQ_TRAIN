package com.pmh.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "PMH_REFRESH_TOKEN")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "pmh_refresh_token_seq_gen")
    @SequenceGenerator(name = "pmh_refresh_token_seq_gen", sequenceName = "PMH_REFRESH_TOKEN_SEQ", allocationSize = 1)
    private Long id;

    @Column(unique = true, length = 500)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID")
    private Users user;

    @Column
    private LocalDateTime expiryDate;

    @Column
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "REVOKED")
    private Boolean revoked = false;
}
