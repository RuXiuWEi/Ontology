package com.ontology.backend.action.application;

import com.ontology.backend.action.infra.ActionExecutionRepository;
import com.ontology.backend.action.infra.ActionTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActionConstraintService {

    private final ActionTypeRepository actionTypeRepository;
    private final ActionExecutionRepository actionExecutionRepository;

    public ActionConstraintService(
            ActionTypeRepository actionTypeRepository,
            ActionExecutionRepository actionExecutionRepository
    ) {
        this.actionTypeRepository = actionTypeRepository;
        this.actionExecutionRepository = actionExecutionRepository;
    }

    @Transactional(readOnly = true)
    public boolean hasActionTypesForObjectType(Long objectTypeId) {
        return actionTypeRepository.existsByTargetType_Id(objectTypeId);
    }

    @Transactional(readOnly = true)
    public boolean hasActionExecutionsForObjectInstance(Long objectInstanceId) {
        return actionExecutionRepository.existsByTargetInstance_Id(objectInstanceId);
    }

    @Transactional(readOnly = true)
    public boolean hasExecutionsForActionType(Long actionTypeId) {
        return actionExecutionRepository.existsByActionType_Id(actionTypeId);
    }
}
