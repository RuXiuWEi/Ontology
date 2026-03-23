package com.ontology.backend.relation.infra;

import com.ontology.backend.relation.domain.RelationEdge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("""
            select (count(e) > 0) from RelationEdge e
            where e.relationType.id = :relationTypeId
              and (
                    (e.sourceInstance.id = :instanceAId and e.targetInstance.id = :instanceBId)
                 or (e.sourceInstance.id = :instanceBId and e.targetInstance.id = :instanceAId)
              )
            """)
    boolean existsUndirectedPair(
            @Param("relationTypeId") Long relationTypeId,
            @Param("instanceAId") Long instanceAId,
            @Param("instanceBId") Long instanceBId
    );

    @Query("""
            select (count(e) > 0) from RelationEdge e
            where e.relationType.id = :relationTypeId
              and (e.sourceInstance.id = :instanceId or e.targetInstance.id = :instanceId)
            """)
    boolean existsByRelationTypeAndEitherEndpoint(
            @Param("relationTypeId") Long relationTypeId,
            @Param("instanceId") Long instanceId
    );

    List<RelationEdge> findBySourceInstance_IdOrTargetInstance_Id(Long sourceInstanceId, Long targetInstanceId);

    List<RelationEdge> findAllBySourceInstance_IdOrTargetInstance_IdOrderByIdDesc(Long sourceInstanceId, Long targetInstanceId);

    List<RelationEdge> findAllBySourceInstance_IdOrderByIdDesc(Long sourceInstanceId);

    List<RelationEdge> findAllByTargetInstance_IdOrderByIdDesc(Long targetInstanceId);
}
