package com.ontology.backend.relation.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RelationTypeRequest(
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 255) String name,
        @NotNull(message = "sourceTypeId 不能为空") Long sourceTypeId,
        @NotNull(message = "targetTypeId 不能为空") Long targetTypeId,
        @NotBlank(message = "cardinality 不能为空") String cardinality,
        @NotBlank(message = "direction 不能为空") String direction,
        String description
) {
}
