package com.ontology.backend.version.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ModelVersionRollbackRequest(
        @NotBlank @Size(max = 64) String modelCode,
        @NotNull Integer targetVersionNo,
        String changeLog
) {
}
