package com.ontology.backend.web.dto;

public record DashboardSummaryResponse(
        long objectTypeTotal,
        long objectTypeCreatedLast7Days,
        long objectInstanceTotal,
        long objectInstanceCreatedLast7Days,
        long activeUserTotal,
        long auditEventsLast7Days,
        java.util.List<DashboardDailyPointResponse> dailyTrend
) {
}
