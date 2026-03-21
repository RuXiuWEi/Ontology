package com.ontology.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ontology.backend.domain.AuditLog;
import com.ontology.backend.repository.AuditLogRepository;
import com.ontology.backend.web.dto.AuditLogListRequest;
import com.ontology.backend.web.dto.AuditLogResponse;
import com.ontology.backend.web.dto.PageResponse;
import jakarta.annotation.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.data.domain.Sort;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditLogService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void log(String action, String resource, @Nullable String resourceId, @Nullable Object details) {
        AuditLog log = new AuditLog();
        log.setUsername(resolveCurrentUsername().orElse("anonymous"));
        log.setAction(action);
        log.setResource(resource);
        log.setResourceId(resourceId);
        log.setDetails(toJson(details));
        log.setCreatedAt(Instant.now());
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> list(AuditLogListRequest req, Pageable pageable) {
        Specification<AuditLog> spec = buildSpec(withPreset(req));
        Page<AuditLogResponse> page = auditLogRepository.findAll(spec, pageable).map(this::toResponse);
        return PageResponse.of(page);
    }

    @Transactional(readOnly = true)
    public void exportCsv(AuditLogListRequest req, HttpServletResponse response) {
        Specification<AuditLog> spec = buildSpec(withPreset(req));
        var rows = auditLogRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
        response.setStatus(HttpServletResponse.SC_OK);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"audit-logs.csv\"");
        try {
            var out = response.getWriter();
            out.write("id,createdAt,username,action,resource,resourceId,details\n");
            for (AuditLog log : rows) {
                out.write(csv(log.getId()));
                out.write(',');
                out.write(csv(log.getCreatedAt()));
                out.write(',');
                out.write(csv(log.getUsername()));
                out.write(',');
                out.write(csv(log.getAction()));
                out.write(',');
                out.write(csv(log.getResource()));
                out.write(',');
                out.write(csv(log.getResourceId()));
                out.write(',');
                out.write(csv(log.getDetails()));
                out.write('\n');
            }
            out.flush();
        } catch (IOException e) {
            throw new IllegalStateException("导出审计日志失败", e);
        }
    }

    private AuditLogListRequest withPreset(AuditLogListRequest req) {
        String preset = req.timeRangePreset();
        if (!StringUtils.hasText(preset) || req.createdFrom() != null || req.createdTo() != null) {
            return req;
        }
        Instant now = Instant.now();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        return switch (preset.trim().toUpperCase()) {
            case "TODAY" -> new AuditLogListRequest(
                    req.username(),
                    req.action(),
                    req.resource(),
                    today.atStartOfDay().toInstant(ZoneOffset.UTC),
                    now,
                    req.timeRangePreset()
            );
            case "LAST_7_DAYS" -> new AuditLogListRequest(
                    req.username(),
                    req.action(),
                    req.resource(),
                    now.minus(7, ChronoUnit.DAYS),
                    now,
                    req.timeRangePreset()
            );
            case "LAST_30_DAYS" -> new AuditLogListRequest(
                    req.username(),
                    req.action(),
                    req.resource(),
                    now.minus(30, ChronoUnit.DAYS),
                    now,
                    req.timeRangePreset()
            );
            default -> req;
        };
    }

    private Specification<AuditLog> buildSpec(AuditLogListRequest req) {
        return Specification.allOf(
                likeIgnoreCase("username", req.username()),
                equalsValue("action", req.action()),
                equalsValue("resource", req.resource()),
                gteCreatedAt(req.createdFrom()),
                lteCreatedAt(req.createdTo())
        );
    }

    private String csv(Object value) {
        if (value == null) {
            return "\"\"";
        }
        String s = String.valueOf(value).replace("\"", "\"\"");
        return "\"" + s + "\"";
    }

    private Optional<String> resolveCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        return Optional.of(authentication.getName());
    }

    private String toJson(@Nullable Object details) {
        if (details == null) {
            return null;
        }
        if (details instanceof String s) {
            return s;
        }
        try {
            return objectMapper.writeValueAsString(details);
        } catch (JsonProcessingException e) {
            return "{\"error\":\"serialize_failed\"}";
        }
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getUsername(),
                log.getAction(),
                log.getResource(),
                log.getResourceId(),
                log.getDetails(),
                log.getCreatedAt()
        );
    }

    private static Specification<AuditLog> likeIgnoreCase(String field, @Nullable String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String pattern = "%" + value.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get(field)), pattern);
    }

    private static Specification<AuditLog> equalsValue(String field, @Nullable String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get(field), value.trim());
    }

    private static Specification<AuditLog> gteCreatedAt(@Nullable Instant value) {
        if (value == null) {
            return null;
        }
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), value);
    }

    private static Specification<AuditLog> lteCreatedAt(@Nullable Instant value) {
        if (value == null) {
            return null;
        }
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), value);
    }
}
