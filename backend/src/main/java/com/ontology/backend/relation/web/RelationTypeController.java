package com.ontology.backend.relation.web;

import com.ontology.backend.relation.application.RelationTypeService;
import com.ontology.backend.relation.web.dto.RelationTypeRequest;
import com.ontology.backend.relation.web.dto.RelationTypeResponse;
import com.ontology.backend.web.ApiResponse;
import com.ontology.backend.web.dto.PageResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/relation-types")
public class RelationTypeController {

    private final RelationTypeService relationTypeService;

    public RelationTypeController(RelationTypeService relationTypeService) {
        this.relationTypeService = relationTypeService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<PageResponse<RelationTypeResponse>> list(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ApiResponse.ok(relationTypeService.list(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<RelationTypeResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(relationTypeService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<RelationTypeResponse> create(@Valid @RequestBody RelationTypeRequest request) {
        return ApiResponse.ok(relationTypeService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<RelationTypeResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RelationTypeRequest request
    ) {
        return ApiResponse.ok(relationTypeService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        relationTypeService.delete(id);
        return ApiResponse.ok(null);
    }
}
