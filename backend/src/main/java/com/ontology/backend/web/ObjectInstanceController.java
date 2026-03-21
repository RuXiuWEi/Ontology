package com.ontology.backend.web;

import com.ontology.backend.service.ObjectInstanceService;
import com.ontology.backend.web.dto.ObjectInstanceRequest;
import com.ontology.backend.web.dto.ObjectInstanceResponse;
import com.ontology.backend.web.dto.PageResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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
@RequestMapping("/api/instances")
public class ObjectInstanceController {

    private final ObjectInstanceService objectInstanceService;

    public ObjectInstanceController(ObjectInstanceService objectInstanceService) {
        this.objectInstanceService = objectInstanceService;
    }

    @GetMapping
    public ApiResponse<PageResponse<ObjectInstanceResponse>> list(
            @RequestParam(required = false) Long typeId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ApiResponse.ok(objectInstanceService.list(Optional.ofNullable(typeId), pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<ObjectInstanceResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(objectInstanceService.get(id));
    }

    @PostMapping
    public ApiResponse<ObjectInstanceResponse> create(@Valid @RequestBody ObjectInstanceRequest request) {
        return ApiResponse.ok(objectInstanceService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<ObjectInstanceResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ObjectInstanceRequest request
    ) {
        return ApiResponse.ok(objectInstanceService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        objectInstanceService.delete(id);
        return ApiResponse.ok(null);
    }
}
