package com.ontology.backend.web.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ObjectSetMembersReplaceRequest(
        @NotNull List<Long> instanceIds
) {
}
