package com.ontology.backend.action.web.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record ExecuteActionRequest(
        @NotNull(message = "actionTypeId 不能为空") Long actionTypeId,
        @NotNull(message = "targetInstanceId 不能为空") Long targetInstanceId,
        Map<String, Object> payload
) {
}
