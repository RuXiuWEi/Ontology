package com.ontology.backend.action.web.dto;

import java.time.Instant;

public record ActionTypeResponse(
        Long id,
        String code,
        String name,
        Long targetTypeId,
        String targetTypeCode,
        String executorType,
        String parameterSchema,
        String preconditionExpression,
        String description,
        boolean enabled,
        Instant createdAt,
        Instant updatedAt
) {
}
