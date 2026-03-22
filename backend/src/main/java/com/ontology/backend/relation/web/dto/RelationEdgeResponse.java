package com.ontology.backend.relation.web.dto;

import java.time.Instant;
import java.util.Map;

public record RelationEdgeResponse(
        Long id,
        Long relationTypeId,
        String relationTypeCode,
        Long sourceInstanceId,
        String sourceInstanceName,
        Long targetInstanceId,
        String targetInstanceName,
        Map<String, Object> attributes,
        Instant createdAt,
        Instant updatedAt
) {
}
