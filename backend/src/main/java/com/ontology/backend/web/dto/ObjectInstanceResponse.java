package com.ontology.backend.web.dto;

import java.time.Instant;
import java.util.Map;

public record ObjectInstanceResponse(
        Long id,
        Long typeId,
        String typeCode,
        String name,
        Map<String, Object> attributes,
        Instant createdAt,
        Instant updatedAt
) {
}
