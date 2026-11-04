package com.pmh.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "PMH_COMPONENTS")
@Builder
public class Components extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "pmh_components_seq_gen")
    @SequenceGenerator(
            name = "pmh_components_seq_gen",
            sequenceName = "PMH_COMPONENTS_SEQ",
            allocationSize = 1
    )
    @Column(name = "ID")
    private Long id;


    @Column(name = "COMPONENT_CODE", nullable = false, length = 255)
    private String componentCode;

    @Column(name = "COMPONENT_NAME", nullable = false, length = 255)
    private String componentName;

    @Column(name = "MESSAGE_TYPE", length = 255)
    private String messageType;

    @Column(name = "CONNECTION_METHOD", length = 255)
    private String connectionMethod;

    @Builder.Default
    @Column(name = "CHECK_TOKEN", columnDefinition = "CHAR(1)")
    private String checkToken = "N";

    @Column(name = "DESCRIPTION", columnDefinition = "VARCHAR2(4000 CHAR)")
    private String description;

    @Column(name = "NEW_DATA", columnDefinition = "VARCHAR2(4000 CHAR)")
    private String newData;

    @Column(name = "EFFECTIVE_DATE", nullable = false)
    private LocalDateTime effectiveDate;

    @Column(name = "END_EFFECTIVE_DATE")
    private LocalDateTime endEffectiveDate;


}
