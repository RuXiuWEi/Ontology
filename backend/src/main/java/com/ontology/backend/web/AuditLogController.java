package com.ontology.backend.web;

import com.ontology.backend.service.AuditLogService;
import com.ontology.backend.web.dto.AuditLogListRequest;
import com.ontology.backend.web.dto.AuditLogResponse;
import com.ontology.backend.web.dto.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<PageResponse<AuditLogResponse>> list(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String resource,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String preset,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        AuditLogListRequest req = new AuditLogListRequest(username, action, resource, from, to, preset);
        return ApiResponse.ok(auditLogService.list(req, pageable));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public void exportCsv(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String resource,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String preset,
            jakarta.servlet.http.HttpServletResponse response
    ) {
        AuditLogListRequest req = new AuditLogListRequest(username, action, resource, from, to, preset);
        auditLogService.exportCsv(req, response);
    }
}
