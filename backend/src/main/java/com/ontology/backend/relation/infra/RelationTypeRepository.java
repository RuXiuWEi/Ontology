package com.ontology.backend.relation.infra;

import com.ontology.backend.relation.domain.RelationType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RelationTypeRepository extends JpaRepository<RelationType, Long> {

    boolean existsByCode(String code);

    boolean existsBySourceType_IdOrTargetType_Id(Long sourceTypeId, Long targetTypeId);
}
