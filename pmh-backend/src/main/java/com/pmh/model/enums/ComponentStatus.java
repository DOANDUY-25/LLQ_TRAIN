package com.pmh.model.enums;

import lombok.Getter;

@Getter
public enum ComponentStatus {
    NEW(1),
    PENDING(3),
    APPROVED(4),
    REJECTED(5),
    CANCELLED(7);

    private final int code;


    ComponentStatus(int code) {
        this.code = code;
    }

    public static ComponentStatus formCode(int code) {
        for (ComponentStatus status : values()) {
            if (status.getCode() == code) {
                return status;
            }
        }
        throw new IllegalArgumentException("Trạng thái không hợp lệ" + code);
    }
}
