package com.ontology.backend.web;

import com.ontology.backend.service.ObjectSetService;
import com.ontology.backend.web.dto.ObjectInstanceResponse;
import com.ontology.backend.web.dto.ObjectSetMembersReplaceRequest;
import com.ontology.backend.web.dto.ObjectSetRequest;
import com.ontology.backend.web.dto.ObjectSetResponse;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/object-sets")
public class ObjectSetController {

    private final ObjectSetService objectSetService;

    public ObjectSetController(ObjectSetService objectSetService) {
        this.objectSetService = objectSetService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<PageResponse<ObjectSetResponse>> list(
            @RequestParam(required = false) Long typeId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ApiResponse.ok(objectSetService.list(Optional.ofNullable(typeId), pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<ObjectSetResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(objectSetService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<ObjectSetResponse> create(@Valid @RequestBody ObjectSetRequest request) {
        return ApiResponse.ok(objectSetService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<ObjectSetResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ObjectSetRequest request
    ) {
        return ApiResponse.ok(objectSetService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        objectSetService.delete(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/{id}/members")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<PageResponse<ObjectInstanceResponse>> listMembers(
            @PathVariable Long id,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ApiResponse.ok(objectSetService.listMembers(id, pageable));
    }

    @PutMapping("/{id}/members")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<Void> replaceMembers(
            @PathVariable Long id,
            @Valid @RequestBody ObjectSetMembersReplaceRequest request
    ) {
        objectSetService.replaceMembers(id, request);
        return ApiResponse.ok(null);
    }
}
