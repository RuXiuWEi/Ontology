package com.ontology.backend.relation.web.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record RelationEdgeRequest(
        @NotNull(message = "relationTypeId 不能为空") Long relationTypeId,
        @NotNull(message = "sourceInstanceId 不能为空") Long sourceInstanceId,
        @NotNull(message = "targetInstanceId 不能为空") Long targetInstanceId,
        Map<String, Object> attributes
) {
}
