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

import java.time.Instant;
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
        Specification<AuditLog> spec = Specification.allOf(
                likeIgnoreCase("username", req.username()),
                equalsValue("action", req.action()),
                equalsValue("resource", req.resource()),
                gteCreatedAt(req.createdFrom()),
                lteCreatedAt(req.createdTo())
        );
        Page<AuditLogResponse> page = auditLogRepository.findAll(spec, pageable).map(this::toResponse);
        return PageResponse.of(page);
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
