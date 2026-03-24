package com.ontology.backend.repository;

import com.ontology.backend.domain.ObjectSetMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ObjectSetMemberRepository extends JpaRepository<ObjectSetMember, Long> {

    List<ObjectSetMember> findByObjectSet_IdOrderByIdAsc(Long objectSetId);

    Page<ObjectSetMember> findByObjectSet_Id(Long objectSetId, Pageable pageable);

    long countByObjectSet_Id(Long objectSetId);

    void deleteByObjectSet_Id(Long objectSetId);

    void deleteByObjectSet_IdAndObjectInstance_IdIn(Long objectSetId, Collection<Long> instanceIds);

    boolean existsByObjectSet_IdAndObjectInstance_Id(Long objectSetId, Long objectInstanceId);
}
