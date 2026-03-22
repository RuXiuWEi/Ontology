package com.ontology.backend.relation.application;

import com.ontology.backend.relation.infra.RelationEdgeRepository;
import com.ontology.backend.relation.infra.RelationTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RelationConstraintService {

    private final RelationTypeRepository relationTypeRepository;
    private final RelationEdgeRepository relationEdgeRepository;

    public RelationConstraintService(
            RelationTypeRepository relationTypeRepository,
            RelationEdgeRepository relationEdgeRepository
    ) {
        this.relationTypeRepository = relationTypeRepository;
        this.relationEdgeRepository = relationEdgeRepository;
    }

    @Transactional(readOnly = true)
    public boolean hasRelationsForObjectType(Long typeId) {
        return relationTypeRepository.existsBySourceType_IdOrTargetType_Id(typeId, typeId);
    }

    @Transactional(readOnly = true)
    public boolean hasRelationsForObjectInstance(Long instanceId) {
        return relationEdgeRepository.existsBySourceInstance_IdOrTargetInstance_Id(instanceId, instanceId);
    }

    @Transactional(readOnly = true)
    public boolean hasEdgesForRelationType(Long relationTypeId) {
        return relationEdgeRepository.existsByRelationType_Id(relationTypeId);
    }
}
