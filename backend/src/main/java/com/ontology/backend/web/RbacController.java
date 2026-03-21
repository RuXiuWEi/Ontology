package com.ontology.backend.web;

import com.ontology.backend.service.RbacService;
import com.ontology.backend.web.dto.AssignRolesRequest;
import com.ontology.backend.web.dto.PageResponse;
import com.ontology.backend.web.dto.RoleResponse;
import com.ontology.backend.web.dto.UserSummaryResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/rbac")
@PreAuthorize("hasAuthority('ADMIN')")
public class RbacController {

    private final RbacService rbacService;

    public RbacController(RbacService rbacService) {
        this.rbacService = rbacService;
    }

    @GetMapping("/roles")
    public ApiResponse<List<RoleResponse>> roles() {
        return ApiResponse.ok(rbacService.listRoles());
    }

    @GetMapping("/users")
    public ApiResponse<PageResponse<UserSummaryResponse>> users(
            @RequestParam(required = false) String username,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ApiResponse.ok(rbacService.listUsers(username, pageable));
    }

    @PutMapping("/users/{id}/roles")
    public ApiResponse<UserSummaryResponse> assignRoles(
            @PathVariable Long id,
            @Valid @RequestBody AssignRolesRequest request
    ) {
        return ApiResponse.ok(rbacService.assignRoles(id, request));
    }
}
