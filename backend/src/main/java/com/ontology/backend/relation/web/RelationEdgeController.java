package com.ontology.backend.relation.web;

import com.ontology.backend.relation.application.RelationEdgeService;
import com.ontology.backend.relation.web.dto.RelationEdgeRequest;
import com.ontology.backend.relation.web.dto.RelationEdgeResponse;
import com.ontology.backend.relation.web.dto.RelationNeighborResponse;
import com.ontology.backend.web.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/relations")
public class RelationEdgeController {

    private final RelationEdgeService relationEdgeService;

    public RelationEdgeController(RelationEdgeService relationEdgeService) {
        this.relationEdgeService = relationEdgeService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<RelationEdgeResponse> create(@Valid @RequestBody RelationEdgeRequest request) {
        return ApiResponse.ok(relationEdgeService.create(request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        relationEdgeService.delete(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/neighbors")
    @PreAuthorize("hasAnyAuthority('ADMIN','EDITOR','VIEWER')")
    public ApiResponse<List<RelationNeighborResponse>> neighbors(@RequestParam Long instanceId) {
        return ApiResponse.ok(relationEdgeService.neighbors(instanceId));
    }
}
