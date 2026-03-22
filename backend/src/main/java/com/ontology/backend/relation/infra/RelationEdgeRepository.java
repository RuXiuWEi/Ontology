package com.ontology.backend.relation.infra;

import com.ontology.backend.relation.domain.RelationEdge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RelationEdgeRepository extends JpaRepository<RelationEdge, Long> {

    boolean existsBySourceInstance_IdOrTargetInstance_Id(Long sourceInstanceId, Long targetInstanceId);

    boolean existsByRelationType_Id(Long relationTypeId);

    boolean existsByRelationType_IdAndSourceInstance_Id(Long relationTypeId, Long sourceInstanceId);

    boolean existsByRelationType_IdAndTargetInstance_Id(Long relationTypeId, Long targetInstanceId);

    boolean existsByRelationType_IdAndSourceInstance_IdAndTargetInstance_Id(
            Long relationTypeId,
            Long sourceInstanceId,
            Long targetInstanceId
    );

    List<RelationEdge> findBySourceInstance_IdOrTargetInstance_Id(Long sourceInstanceId, Long targetInstanceId);

    List<RelationEdge> findAllBySourceInstance_IdOrderByIdDesc(Long sourceInstanceId);

    List<RelationEdge> findAllByTargetInstance_IdOrderByIdDesc(Long targetInstanceId);
}
