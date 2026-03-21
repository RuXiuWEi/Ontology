package com.ontology.backend.web.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record AssignRolesRequest(
        @NotEmpty(message = "roles 不能为空") List<String> roles
) {
}
