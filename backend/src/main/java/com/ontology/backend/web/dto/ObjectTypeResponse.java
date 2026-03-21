package com.ontology.backend.web.dto;

import java.time.Instant;

public record ObjectTypeResponse(
        Long id,
        String code,
        String name,
        String description,
        Instant createdAt,
        Instant updatedAt
) {
}
