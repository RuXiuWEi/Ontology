package com.ontology.backend.action.web;

import com.ontology.backend.action.application.ActionExecutionService;
import com.ontology.backend.action.web.dto.ActionExecutionResponse;
import com.ontology.backend.action.web.dto.ExecuteActionRequest;
import com.ontology.backend.web.ApiResponse;
import com.ontology.backend.web.dto.PageResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/action-executions")
public class ActionExecutionController {

    private final ActionExecutionService actionExecutionService;

    public ActionExecutionController(ActionExecutionService actionExecutionService) {
        this.actionExecutionService = actionExecutionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<PageResponse<ActionExecutionResponse>> list(
            @RequestParam(required = false) Long actionTypeId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ApiResponse.ok(actionExecutionService.list(Optional.ofNullable(actionTypeId), pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<ActionExecutionResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(actionExecutionService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<ActionExecutionResponse> execute(@Valid @RequestBody ExecuteActionRequest request) {
        return ApiResponse.ok(actionExecutionService.execute(request));
    }

    @PostMapping("/{id}/retry")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<ActionExecutionResponse> retry(@PathVariable Long id) {
        return ApiResponse.ok(actionExecutionService.retry(id));
    }
}
