package com.ontology.backend.web;

import com.ontology.backend.service.ObjectTypeService;
import com.ontology.backend.web.dto.ObjectTypeRequest;
import com.ontology.backend.web.dto.ObjectTypeResponse;
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
@RequestMapping("/api/object-types")
public class ObjectTypeController {

    private final ObjectTypeService objectTypeService;

    public ObjectTypeController(ObjectTypeService objectTypeService) {
        this.objectTypeService = objectTypeService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<PageResponse<ObjectTypeResponse>> list(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ApiResponse.ok(objectTypeService.list(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<ObjectTypeResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(objectTypeService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<ObjectTypeResponse> create(@Valid @RequestBody ObjectTypeRequest request) {
        return ApiResponse.ok(objectTypeService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<ObjectTypeResponse> update(@PathVariable Long id, @Valid @RequestBody ObjectTypeRequest request) {
        return ApiResponse.ok(objectTypeService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        objectTypeService.delete(id);
        return ApiResponse.ok(null);
    }
}
