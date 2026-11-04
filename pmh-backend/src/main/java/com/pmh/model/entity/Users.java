package com.pmh.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "PMH_USERS")
public class Users {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "pmh_users_seq_gen")
    @SequenceGenerator(name = "pmh_users_seq_gen", sequenceName = "PMH_USERS_SEQ", allocationSize = 1)
    @Column(name = "ID")
    private Long id;

    @Column(name = "USERNAME", nullable = false, length = 255, unique = true)
    private String username;

    @Column(name = "EMAIL", nullable = false, length = 255)
    private String email;

    @Column(name = "PASSWORD", nullable = false, length = 255)
    private String password;

    @Column(name = "ENABLED", length = 1)
    private String enabled = "Y";

    @Column(name = "FULL_NAME", length = 255)
    private String fullName;

    @Column(name = "LOCKOUT_UNTIL")
    private LocalDateTime lockoutUntil;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "PMH_USER_ROLE",
            joinColumns = @JoinColumn(name = "USER_ID"),
            inverseJoinColumns = @JoinColumn(name = "ROLE_ID")
    )
    private Set<Roles> roles = new HashSet<>();
}
