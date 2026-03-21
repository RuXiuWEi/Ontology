package com.ontology.backend.web.dto;

import java.time.Instant;

public record AuditLogResponse(
        Long id,
        String username,
        String action,
        String resource,
        String resourceId,
        String details,
        Instant createdAt
) {
}
