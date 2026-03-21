package com.ontology.backend.web;

import java.time.Instant;

public record ApiResponse<T>(int code, String message, T data, String timestamp) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(0, "OK", data, Instant.now().toString());
    }

    public static <T> ApiResponse<T> fail(int code, String message) {
        return new ApiResponse<>(code, message, null, Instant.now().toString());
    }
}
