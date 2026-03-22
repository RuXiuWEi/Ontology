package com.ontology.backend.relation.web.dto;

import java.time.Instant;
import java.util.Map;

public record RelationNeighborResponse(
        Long edgeId,
        Long relationTypeId,
        String relationTypeCode,
        String relationTypeName,
        Long sourceInstanceId,
        String sourceInstanceName,
        Long sourceTypeId,
        String sourceTypeCode,
        Long targetInstanceId,
        String targetInstanceName,
        Long targetTypeId,
        String targetTypeCode,
        Map<String, Object> attributes,
        Instant createdAt
) {
}
