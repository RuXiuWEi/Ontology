package com.ontology.backend.web.dto;

import java.time.Instant;

public record ObjectSetResponse(
        Long id,
        Long typeId,
        String typeCode,
        String name,
        String description,
        String kind,
        String ruleExpression,
        String ruleSource,
        Instant snapshotAt,
        String owner,
        String notes,
        long memberCount,
        Instant createdAt,
        Instant updatedAt
) {
}
