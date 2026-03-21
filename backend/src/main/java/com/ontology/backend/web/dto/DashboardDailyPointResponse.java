package com.ontology.backend.web.dto;

public record DashboardDailyPointResponse(
        String day,
        long objectTypeCreated,
        long objectInstanceCreated,
        long auditEvents
) {
}
