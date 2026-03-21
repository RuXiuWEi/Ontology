package com.ontology.backend.web.dto;

import java.time.Instant;
import java.util.List;

public record UserSummaryResponse(
        Long id,
        String username,
        boolean enabled,
        List<String> roles,
        Instant createdAt,
        Instant updatedAt
) {
}
