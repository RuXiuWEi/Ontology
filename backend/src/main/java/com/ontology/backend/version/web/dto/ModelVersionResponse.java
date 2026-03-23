package com.ontology.backend.version.web.dto;

import java.time.Instant;
import java.util.Map;

public record ModelVersionResponse(
        Long id,
        String modelCode,
        int versionNo,
        String title,
        Map<String, Object> content,
        String status,
        String changeLog,
        String createdBy,
        String publishedBy,
        Instant publishedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
