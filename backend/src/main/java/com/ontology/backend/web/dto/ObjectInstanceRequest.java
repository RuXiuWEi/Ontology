package com.ontology.backend.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record ObjectInstanceRequest(
        @NotNull(message = "typeId 不能为空") Long typeId,
        @NotBlank @Size(max = 255) String name,
        Map<String, Object> attributes
) {
}
