package com.ontology.backend.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record ObjectSetRequest(
        @NotNull(message = "typeId 不能为空") Long typeId,
        @NotBlank @Size(max = 255) String name,
        @Size(max = 2000) String description,
        @NotBlank @Size(max = 32) String kind,
        @Size(max = 10000) String ruleExpression,
        @NotBlank @Size(max = 32) String ruleSource,
        Instant snapshotAt,
        @Size(max = 128) String owner,
        @Size(max = 5000) String notes
) {
}
