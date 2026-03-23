package com.ontology.backend.relation.application;

import com.ontology.backend.domain.ObjectInstance;
import com.ontology.backend.domain.ObjectType;
import com.ontology.backend.relation.domain.RelationCardinality;
import com.ontology.backend.relation.domain.RelationEdge;
import com.ontology.backend.relation.domain.RelationDirection;
import com.ontology.backend.relation.domain.RelationType;
import com.ontology.backend.relation.infra.RelationEdgeRepository;
import com.ontology.backend.relation.infra.RelationTypeRepository;
import com.ontology.backend.relation.web.dto.RelationEdgeRequest;
import com.ontology.backend.relation.web.dto.RelationEdgeResponse;
import com.ontology.backend.relation.web.dto.RelationNeighborResponse;
import com.ontology.backend.repository.ObjectInstanceRepository;
import com.ontology.backend.service.AuditLogService;
import com.ontology.backend.web.BusinessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RelationEdgeService {

    private final RelationEdgeRepository relationEdgeRepository;
    private final RelationTypeRepository relationTypeRepository;
    private final ObjectInstanceRepository objectInstanceRepository;
    private final AuditLogService auditLogService;

    public RelationEdgeService(
            RelationEdgeRepository relationEdgeRepository,
            RelationTypeRepository relationTypeRepository,
            ObjectInstanceRepository objectInstanceRepository,
            AuditLogService auditLogService
    ) {
        this.relationEdgeRepository = relationEdgeRepository;
        this.relationTypeRepository = relationTypeRepository;
        this.objectInstanceRepository = objectInstanceRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public RelationEdgeResponse create(RelationEdgeRequest request) {
        RelationType relationType = relationTypeRepository.findById(request.relationTypeId())
                .orElseThrow(() -> new BusinessException(40421, "关系类型不存在"));
        ObjectInstance sourceInstance = objectInstanceRepository.findById(request.sourceInstanceId())
                .orElseThrow(() -> new BusinessException(40402, "源对象实例不存在"));
        ObjectInstance targetInstance = objectInstanceRepository.findById(request.targetInstanceId())
                .orElseThrow(() -> new BusinessException(40402, "目标对象实例不存在"));

        validateInstanceType(relationType, sourceInstance, targetInstance);
        validateCardinality(relationType, sourceInstance.getId(), targetInstance.getId());

        RelationEdge edge = new RelationEdge();
        edge.setRelationType(relationType);
        edge.setSourceInstance(sourceInstance);
        edge.setTargetInstance(targetInstance);
        edge.setAttributes(request.attributes());
        edge.setCreatedAt(Instant.now());
        edge.setUpdatedAt(Instant.now());
        RelationEdge saved = relationEdgeRepository.save(edge);
        auditLogService.log("CREATE", "RELATION_EDGE", String.valueOf(saved.getId()), buildDetails(saved));
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        RelationEdge edge = relationEdgeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(40422, "关系不存在"));
        relationEdgeRepository.deleteById(id);
        auditLogService.log("DELETE", "RELATION_EDGE", String.valueOf(id), buildDetails(edge));
    }

    @Transactional(readOnly = true)
    public List<RelationNeighborResponse> neighbors(Long instanceId) {
        if (!objectInstanceRepository.existsById(instanceId)) {
            throw new BusinessException(40402, "对象实例不存在");
        }
        return relationEdgeRepository
                .findAllBySourceInstance_IdOrTargetInstance_IdOrderByIdDesc(instanceId, instanceId)
                .stream()
                .map(this::toNeighbor)
                .collect(Collectors.toList());
    }

    private void validateInstanceType(RelationType relationType, ObjectInstance sourceInstance, ObjectInstance targetInstance) {
        ObjectType sourceType = relationType.getSourceType();
        ObjectType targetType = relationType.getTargetType();
        if (!sourceType.getId().equals(sourceInstance.getType().getId())) {
            throw new BusinessException(40021, "源对象实例类型不匹配关系定义");
        }
        if (!targetType.getId().equals(targetInstance.getType().getId())) {
            throw new BusinessException(40022, "目标对象实例类型不匹配关系定义");
        }
    }

    private void validateCardinality(RelationType relationType, Long sourceInstanceId, Long targetInstanceId) {
        if (relationType.getDirection() == RelationDirection.UNDIRECTED) {
            if (relationEdgeRepository.existsUndirectedPair(relationType.getId(), sourceInstanceId, targetInstanceId)) {
                throw new BusinessException(40921, "关系已存在");
            }
        } else if (relationEdgeRepository.existsByRelationType_IdAndSourceInstance_IdAndTargetInstance_Id(
                relationType.getId(),
                sourceInstanceId,
                targetInstanceId
        )) {
            throw new BusinessException(40921, "关系已存在");
        }
        RelationCardinality cardinality = relationType.getCardinality();
        if (cardinality == RelationCardinality.ONE_TO_ONE) {
            if (relationEdgeRepository.existsByRelationTypeAndEitherEndpoint(relationType.getId(), sourceInstanceId)) {
                throw new BusinessException(40922, "基数约束冲突：源对象已存在关联");
            }
            if (relationEdgeRepository.existsByRelationTypeAndEitherEndpoint(relationType.getId(), targetInstanceId)) {
                throw new BusinessException(40923, "基数约束冲突：目标对象已存在关联");
            }
            return;
        }
        if (cardinality == RelationCardinality.ONE_TO_MANY) {
            boolean conflict = relationType.getDirection() == RelationDirection.UNDIRECTED
                    ? relationEdgeRepository.existsByRelationTypeAndEitherEndpoint(relationType.getId(), targetInstanceId)
                    : relationEdgeRepository.existsByRelationType_IdAndTargetInstance_Id(relationType.getId(), targetInstanceId);
            if (conflict) {
                throw new BusinessException(40923, "基数约束冲突：目标对象已存在关联");
            }
        }
        if (cardinality == RelationCardinality.MANY_TO_ONE) {
            boolean conflict = relationType.getDirection() == RelationDirection.UNDIRECTED
                    ? relationEdgeRepository.existsByRelationTypeAndEitherEndpoint(relationType.getId(), sourceInstanceId)
                    : relationEdgeRepository.existsByRelationType_IdAndSourceInstance_Id(relationType.getId(), sourceInstanceId);
            if (conflict) {
                throw new BusinessException(40922, "基数约束冲突：源对象已存在关联");
            }
        }
    }

    private Map<String, Object> buildDetails(RelationEdge edge) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("relationTypeId", edge.getRelationType().getId());
        details.put("relationTypeCode", edge.getRelationType().getCode());
        details.put("sourceInstanceId", edge.getSourceInstance().getId());
        details.put("targetInstanceId", edge.getTargetInstance().getId());
        details.put("attributes", edge.getAttributes());
        return details;
    }

    private RelationEdgeResponse toResponse(RelationEdge edge) {
        return new RelationEdgeResponse(
                edge.getId(),
                edge.getRelationType().getId(),
                edge.getRelationType().getCode(),
                edge.getSourceInstance().getId(),
                edge.getSourceInstance().getName(),
                edge.getTargetInstance().getId(),
                edge.getTargetInstance().getName(),
                edge.getAttributes(),
                edge.getCreatedAt(),
                edge.getUpdatedAt()
        );
    }

    private RelationNeighborResponse toNeighbor(RelationEdge edge) {
        return new RelationNeighborResponse(
                edge.getId(),
                edge.getRelationType().getId(),
                edge.getRelationType().getCode(),
                edge.getRelationType().getName(),
                edge.getSourceInstance().getId(),
                edge.getSourceInstance().getName(),
                edge.getSourceInstance().getType().getId(),
                edge.getSourceInstance().getType().getCode(),
                edge.getTargetInstance().getId(),
                edge.getTargetInstance().getName(),
                edge.getTargetInstance().getType().getId(),
                edge.getTargetInstance().getType().getCode(),
                edge.getAttributes(),
                edge.getCreatedAt()
        );
    }
}
