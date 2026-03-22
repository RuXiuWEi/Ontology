package com.ontology.backend.relation.web.dto;

import com.ontology.backend.relation.domain.RelationCardinality;
import com.ontology.backend.relation.domain.RelationDirection;

import java.time.Instant;

public record RelationTypeResponse(
        Long id,
        String code,
        String name,
        Long sourceTypeId,
        String sourceTypeCode,
        Long targetTypeId,
        String targetTypeCode,
        RelationCardinality cardinality,
        RelationDirection direction,
        String description,
        Instant createdAt,
        Instant updatedAt
) {
}
