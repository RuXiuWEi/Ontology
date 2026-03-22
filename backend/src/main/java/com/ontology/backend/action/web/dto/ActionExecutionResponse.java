package com.ontology.backend.action.web.dto;

import com.ontology.backend.action.domain.ActionExecutionStatus;

import java.time.Instant;
import java.util.Map;

public record ActionExecutionResponse(
        Long id,
        Long actionTypeId,
        String actionTypeCode,
        String actionTypeName,
        Long targetInstanceId,
        String targetInstanceName,
        ActionExecutionStatus status,
        Map<String, Object> inputPayload,
        Map<String, Object> resultPayload,
        String errorMessage,
        Instant startedAt,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
