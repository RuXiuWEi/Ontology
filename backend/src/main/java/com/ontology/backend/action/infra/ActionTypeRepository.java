package com.ontology.backend.action.infra;

import com.ontology.backend.action.domain.ActionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActionTypeRepository extends JpaRepository<ActionType, Long> {

    boolean existsByCode(String code);

    boolean existsByTargetType_Id(Long targetTypeId);

    List<ActionType> findAllByTargetType_IdOrderByIdDesc(Long targetTypeId);
}
