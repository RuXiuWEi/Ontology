package com.ontology.backend.relation.application;

import com.ontology.backend.domain.ObjectType;
import com.ontology.backend.repository.ObjectTypeRepository;
import com.ontology.backend.relation.domain.RelationCardinality;
import com.ontology.backend.relation.domain.RelationDirection;
import com.ontology.backend.relation.domain.RelationType;
import com.ontology.backend.relation.infra.RelationTypeRepository;
import com.ontology.backend.relation.web.dto.RelationTypeRequest;
import com.ontology.backend.relation.web.dto.RelationTypeResponse;
import com.ontology.backend.service.AuditLogService;
import com.ontology.backend.web.BusinessException;
import com.ontology.backend.web.dto.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class RelationTypeService {

    private final RelationTypeRepository relationTypeRepository;
    private final ObjectTypeRepository objectTypeRepository;
    private final AuditLogService auditLogService;
    private final RelationConstraintService relationConstraintService;

    public RelationTypeService(
            RelationTypeRepository relationTypeRepository,
            ObjectTypeRepository objectTypeRepository,
            AuditLogService auditLogService,
            RelationConstraintService relationConstraintService
    ) {
        this.relationTypeRepository = relationTypeRepository;
        this.objectTypeRepository = objectTypeRepository;
        this.auditLogService = auditLogService;
        this.relationConstraintService = relationConstraintService;
    }

    @Transactional(readOnly = true)
    public PageResponse<RelationTypeResponse> list(Pageable pageable) {
        Page<RelationTypeResponse> page = relationTypeRepository.findAll(pageable).map(this::toResponse);
        return PageResponse.of(page);
    }

    @Transactional(readOnly = true)
    public RelationTypeResponse get(Long id) {
        return relationTypeRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new BusinessException(40410, "关系类型不存在"));
    }

    @Transactional
    public RelationTypeResponse create(RelationTypeRequest request) {
        String code = request.code().trim();
        if (relationTypeRepository.existsByCode(code)) {
            throw new BusinessException(40910, "关系类型编码已存在");
        }

        ObjectType sourceType = objectTypeRepository.findById(request.sourceTypeId())
                .orElseThrow(() -> new BusinessException(40401, "源对象类型不存在"));
        ObjectType targetType = objectTypeRepository.findById(request.targetTypeId())
                .orElseThrow(() -> new BusinessException(40401, "目标对象类型不存在"));

        RelationType relationType = new RelationType();
        relationType.setCode(code);
        relationType.setName(request.name().trim());
        relationType.setSourceType(sourceType);
        relationType.setTargetType(targetType);
        relationType.setCardinality(parseCardinality(request.cardinality()));
        relationType.setDirection(parseDirection(request.direction()));
        relationType.setDescription(request.description());
        relationType.setCreatedAt(Instant.now());
        relationType.setUpdatedAt(Instant.now());

        RelationType saved = relationTypeRepository.save(relationType);
        auditLogService.log("CREATE", "RELATION_TYPE", String.valueOf(saved.getId()), details(saved));
        return toResponse(saved);
    }

    @Transactional
    public RelationTypeResponse update(Long id, RelationTypeRequest request) {
        RelationType relationType = relationTypeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(40410, "关系类型不存在"));

        String code = request.code().trim();
        if (!relationType.getCode().equals(code) && relationTypeRepository.existsByCode(code)) {
            throw new BusinessException(40910, "关系类型编码已存在");
        }

        ObjectType sourceType = objectTypeRepository.findById(request.sourceTypeId())
                .orElseThrow(() -> new BusinessException(40401, "源对象类型不存在"));
        ObjectType targetType = objectTypeRepository.findById(request.targetTypeId())
                .orElseThrow(() -> new BusinessException(40401, "目标对象类型不存在"));

        relationType.setCode(code);
        relationType.setName(request.name().trim());
        relationType.setSourceType(sourceType);
        relationType.setTargetType(targetType);
        relationType.setCardinality(parseCardinality(request.cardinality()));
        relationType.setDirection(parseDirection(request.direction()));
        relationType.setDescription(request.description());
        relationType.setUpdatedAt(Instant.now());

        RelationType saved = relationTypeRepository.save(relationType);
        auditLogService.log("UPDATE", "RELATION_TYPE", String.valueOf(saved.getId()), details(saved));
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        RelationType relationType = relationTypeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(40410, "关系类型不存在"));
        if (relationConstraintService.hasEdgesForRelationType(id)) {
            throw new BusinessException(40920, "关系类型已被关系实例引用，禁止删除");
        }
        relationTypeRepository.deleteById(id);
        auditLogService.log("DELETE", "RELATION_TYPE", String.valueOf(id), details(relationType));
    }

    private RelationCardinality parseCardinality(String value) {
        try {
            return RelationCardinality.valueOf(value.trim().toUpperCase());
        } catch (Exception ex) {
            throw new BusinessException(40020, "关系基数非法");
        }
    }

    private RelationDirection parseDirection(String value) {
        try {
            return RelationDirection.valueOf(value.trim().toUpperCase());
        } catch (Exception ex) {
            throw new BusinessException(40024, "关系方向非法");
        }
    }

    private Map<String, Object> details(RelationType relationType) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("code", relationType.getCode());
        details.put("name", relationType.getName());
        details.put("sourceTypeId", relationType.getSourceType().getId());
        details.put("targetTypeId", relationType.getTargetType().getId());
        details.put("cardinality", relationType.getCardinality().name());
        details.put("direction", relationType.getDirection().name());
        return details;
    }

    private RelationTypeResponse toResponse(RelationType relationType) {
        return new RelationTypeResponse(
                relationType.getId(),
                relationType.getCode(),
                relationType.getName(),
                relationType.getSourceType().getId(),
                relationType.getSourceType().getCode(),
                relationType.getTargetType().getId(),
                relationType.getTargetType().getCode(),
                relationType.getCardinality(),
                relationType.getDirection(),
                relationType.getDescription(),
                relationType.getCreatedAt(),
                relationType.getUpdatedAt()
        );
    }
}
