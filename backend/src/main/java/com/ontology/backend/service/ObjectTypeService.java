package com.ontology.backend.service;

import com.ontology.backend.domain.ObjectType;
import com.ontology.backend.action.application.ActionConstraintService;
import com.ontology.backend.relation.application.RelationConstraintService;
import com.ontology.backend.repository.ObjectTypeRepository;
import com.ontology.backend.web.BusinessException;
import com.ontology.backend.web.dto.ObjectTypeRequest;
import com.ontology.backend.web.dto.ObjectTypeResponse;
import com.ontology.backend.web.dto.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ObjectTypeService {

    private final ObjectTypeRepository repository;
    private final AuditLogService auditLogService;
    private final RelationConstraintService relationConstraintService;
    private final ActionConstraintService actionConstraintService;

    public ObjectTypeService(
            ObjectTypeRepository repository,
            AuditLogService auditLogService,
            RelationConstraintService relationConstraintService,
            ActionConstraintService actionConstraintService
    ) {
        this.repository = repository;
        this.auditLogService = auditLogService;
        this.relationConstraintService = relationConstraintService;
        this.actionConstraintService = actionConstraintService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ObjectTypeResponse> list(Pageable pageable) {
        Page<ObjectTypeResponse> page = repository.findAll(pageable).map(this::toResponse);
        return PageResponse.of(page);
    }

    @Transactional(readOnly = true)
    public ObjectTypeResponse get(Long id) {
        return repository.findById(id).map(this::toResponse).orElseThrow(() -> new BusinessException(40401, "对象类型不存在"));
    }

    @Transactional
    public ObjectTypeResponse create(ObjectTypeRequest request) {
        if (repository.existsByCode(request.code())) {
            throw new BusinessException(40901, "code 已存在");
        }
        ObjectType entity = new ObjectType();
        entity.setCode(request.code().trim());
        entity.setName(request.name().trim());
        entity.setDescription(request.description());
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        ObjectType saved = repository.save(entity);
        auditLogService.log(
                "CREATE",
                "OBJECT_TYPE",
                String.valueOf(saved.getId()),
                buildDetails(saved, "OBJECT_TYPE_CREATED")
        );
        return toResponse(saved);
    }

    @Transactional
    public ObjectTypeResponse update(Long id, ObjectTypeRequest request) {
        ObjectType entity = repository.findById(id).orElseThrow(() -> new BusinessException(40401, "对象类型不存在"));
        String before = "code=" + entity.getCode() + ",name=" + entity.getName();
        if (!entity.getCode().equals(request.code()) && repository.existsByCode(request.code())) {
            throw new BusinessException(40901, "code 已存在");
        }
        entity.setCode(request.code().trim());
        entity.setName(request.name().trim());
        entity.setDescription(request.description());
        entity.setUpdatedAt(Instant.now());
        ObjectType saved = repository.save(entity);
        Map<String, Object> details = buildDetails(saved, "OBJECT_TYPE_UPDATED");
        details.put("before", before);
        auditLogService.log(
                "UPDATE",
                "OBJECT_TYPE",
                String.valueOf(saved.getId()),
                details
        );
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        ObjectType entity = repository.findById(id).orElse(null);
        if (entity == null) {
            throw new BusinessException(40401, "对象类型不存在");
        }
        if (relationConstraintService.hasRelationsForObjectType(id)) {
            throw new BusinessException(40911, "对象类型已被关系模块引用，禁止删除");
        }
        if (actionConstraintService.hasActionTypesForObjectType(id)) {
            throw new BusinessException(40912, "对象类型已被动作模块引用，禁止删除");
        }
        repository.deleteById(id);
        auditLogService.log(
                "DELETE",
                "OBJECT_TYPE",
                String.valueOf(id),
                buildDetails(entity, "OBJECT_TYPE_DELETED")
        );
    }

    private Map<String, Object> buildDetails(ObjectType entity, String event) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("event", event);
        details.put("code", entity.getCode());
        details.put("name", entity.getName());
        details.put("description", entity.getDescription());
        return details;
    }

    private ObjectTypeResponse toResponse(ObjectType e) {
        return new ObjectTypeResponse(
                e.getId(),
                e.getCode(),
                e.getName(),
                e.getDescription(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
