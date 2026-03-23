package com.ontology.backend.version.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record ModelVersionDraftUpsertRequest(
        @NotBlank @Size(max = 64) String modelCode,
        @NotBlank @Size(max = 255) String title,
        @NotNull(message = "content 不能为空") Map<String, Object> content,
        String changeLog
) {
}
