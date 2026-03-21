package com.ontology.backend.web.dto;

import org.springframework.format.annotation.DateTimeFormat;

import java.time.Instant;

public record AuditLogListRequest(
        String username,
        String action,
        String resource,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant createdFrom,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant createdTo
) {
}
