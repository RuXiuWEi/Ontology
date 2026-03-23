package com.ontology.backend.version.web;

import com.ontology.backend.version.application.ModelVersionService;
import com.ontology.backend.version.web.dto.ModelVersionDraftUpsertRequest;
import com.ontology.backend.version.web.dto.ModelVersionPublishRequest;
import com.ontology.backend.version.web.dto.ModelVersionResponse;
import com.ontology.backend.version.web.dto.ModelVersionRollbackRequest;
import com.ontology.backend.web.ApiResponse;
import com.ontology.backend.web.dto.PageResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/model-versions")
public class ModelVersionController {

    private final ModelVersionService modelVersionService;

    public ModelVersionController(ModelVersionService modelVersionService) {
        this.modelVersionService = modelVersionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<PageResponse<ModelVersionResponse>> list(
            @RequestParam(required = false) String modelCode,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ApiResponse.ok(modelVersionService.list(modelCode, status, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<ModelVersionResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(modelVersionService.get(id));
    }

    @GetMapping("/draft")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<ModelVersionResponse> getDraft(@RequestParam String modelCode) {
        return ApiResponse.ok(modelVersionService.getDraft(modelCode));
    }

    @PutMapping("/draft")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<ModelVersionResponse> saveDraft(@Valid @RequestBody ModelVersionDraftUpsertRequest request) {
        return ApiResponse.ok(modelVersionService.saveDraft(request));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<ModelVersionResponse> publish(
            @PathVariable Long id,
            @Valid @RequestBody ModelVersionPublishRequest request
    ) {
        return ApiResponse.ok(modelVersionService.publish(id, request));
    }

    @PostMapping("/rollback")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<ModelVersionResponse> rollback(@Valid @RequestBody ModelVersionRollbackRequest request) {
        return ApiResponse.ok(modelVersionService.rollback(request));
    }
}
