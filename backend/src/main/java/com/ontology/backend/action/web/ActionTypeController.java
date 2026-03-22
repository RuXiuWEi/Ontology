package com.ontology.backend.action.web;

import com.ontology.backend.action.application.ActionTypeService;
import com.ontology.backend.action.web.dto.ActionTypeRequest;
import com.ontology.backend.action.web.dto.ActionTypeResponse;
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
@RequestMapping("/api/action-types")
public class ActionTypeController {

    private final ActionTypeService actionTypeService;

    public ActionTypeController(ActionTypeService actionTypeService) {
        this.actionTypeService = actionTypeService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<PageResponse<ActionTypeResponse>> list(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ApiResponse.ok(actionTypeService.list(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<ActionTypeResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(actionTypeService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<ActionTypeResponse> create(@Valid @RequestBody ActionTypeRequest request) {
        return ApiResponse.ok(actionTypeService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<ActionTypeResponse> update(@PathVariable Long id, @Valid @RequestBody ActionTypeRequest request) {
        return ApiResponse.ok(actionTypeService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        actionTypeService.delete(id);
        return ApiResponse.ok(null);
    }
}
