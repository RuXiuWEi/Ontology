package com.ontology.backend.action.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ActionTypeRequest(
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 255) String name,
        @NotNull(message = "targetTypeId 不能为空") Long targetTypeId,
        @NotBlank(message = "executorType 不能为空") String executorType,
        Boolean enabled,
        String description,
        String parameterSchema
) {
}
