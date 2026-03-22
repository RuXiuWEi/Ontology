package com.ontology.backend.action.infra;

import com.ontology.backend.action.domain.ActionExecution;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActionExecutionRepository extends JpaRepository<ActionExecution, Long> {

    Page<ActionExecution> findByActionType_Id(Long actionTypeId, Pageable pageable);

    boolean existsByActionType_Id(Long actionTypeId);

    boolean existsByTargetInstance_Id(Long targetInstanceId);
}
