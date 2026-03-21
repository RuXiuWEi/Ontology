package com.ontology.backend.web;

import com.ontology.backend.service.DashboardService;
import com.ontology.backend.web.dto.DashboardDimension;
import com.ontology.backend.web.dto.DashboardSummaryResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<DashboardSummaryResponse> summary(
            @RequestParam(required = false, defaultValue = "OBJECT_TYPE") DashboardDimension dimension
    ) {
        return ApiResponse.ok(dashboardService.summary(dimension));
    }
}
