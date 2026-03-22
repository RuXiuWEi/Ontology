package com.ontology.backend.action.application;

import com.ontology.backend.action.domain.ActionType;
import com.ontology.backend.action.domain.ActionExecutorType;
import com.ontology.backend.action.infra.ActionTypeRepository;
import com.ontology.backend.action.web.dto.ActionTypeRequest;
import com.ontology.backend.action.web.dto.ActionTypeResponse;
import com.ontology.backend.domain.ObjectType;
import com.ontology.backend.repository.ObjectTypeRepository;
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
public class ActionTypeService {

    private final ActionTypeRepository actionTypeRepository;
    private final ObjectTypeRepository objectTypeRepository;
    private final AuditLogService auditLogService;
    private final ActionConstraintService actionConstraintService;

    public ActionTypeService(
            ActionTypeRepository actionTypeRepository,
            ObjectTypeRepository objectTypeRepository,
            AuditLogService auditLogService,
            ActionConstraintService actionConstraintService
    ) {
        this.actionTypeRepository = actionTypeRepository;
        this.objectTypeRepository = objectTypeRepository;
        this.auditLogService = auditLogService;
        this.actionConstraintService = actionConstraintService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ActionTypeResponse> list(Pageable pageable) {
        Page<ActionTypeResponse> page = actionTypeRepository.findAll(pageable).map(this::toResponse);
        return PageResponse.of(page);
    }

    @Transactional(readOnly = true)
    public ActionTypeResponse get(Long id) {
        return actionTypeRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new BusinessException(40430, "动作类型不存在"));
    }

    @Transactional
    public ActionTypeResponse create(ActionTypeRequest request) {
        String code = request.code().trim();
        if (actionTypeRepository.existsByCode(code)) {
            throw new BusinessException(40940, "动作类型编码已存在");
        }
        ObjectType targetType = objectTypeRepository.findById(request.targetTypeId())
                .orElseThrow(() -> new BusinessException(40401, "目标对象类型不存在"));

        ActionType actionType = new ActionType();
        actionType.setCode(code);
        actionType.setName(request.name().trim());
        actionType.setTargetType(targetType);
        actionType.setExecutorType(parseExecutorType(request.executorType()));
        actionType.setDescription(request.description());
        actionType.setParameterSchema(request.parameterSchema());
        actionType.setEnabled(request.enabled() == null || request.enabled());
        actionType.setCreatedAt(Instant.now());
        actionType.setUpdatedAt(Instant.now());

        ActionType saved = actionTypeRepository.save(actionType);
        auditLogService.log("CREATE", "ACTION_TYPE", String.valueOf(saved.getId()), details(saved));
        return toResponse(saved);
    }

    @Transactional
    public ActionTypeResponse update(Long id, ActionTypeRequest request) {
        ActionType actionType = actionTypeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(40430, "动作类型不存在"));

        String code = request.code().trim();
        if (!actionType.getCode().equals(code) && actionTypeRepository.existsByCode(code)) {
            throw new BusinessException(40940, "动作类型编码已存在");
        }
        ObjectType targetType = objectTypeRepository.findById(request.targetTypeId())
                .orElseThrow(() -> new BusinessException(40401, "目标对象类型不存在"));

        actionType.setCode(code);
        actionType.setName(request.name().trim());
        actionType.setTargetType(targetType);
        actionType.setExecutorType(parseExecutorType(request.executorType()));
        actionType.setDescription(request.description());
        actionType.setParameterSchema(request.parameterSchema());
        actionType.setEnabled(request.enabled() == null || request.enabled());
        actionType.setUpdatedAt(Instant.now());

        ActionType saved = actionTypeRepository.save(actionType);
        auditLogService.log("UPDATE", "ACTION_TYPE", String.valueOf(saved.getId()), details(saved));
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        ActionType actionType = actionTypeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(40430, "动作类型不存在"));
        if (actionConstraintService.hasExecutionsForActionType(id)) {
            throw new BusinessException(40941, "动作类型存在执行记录，禁止删除");
        }
        actionTypeRepository.deleteById(id);
        auditLogService.log("DELETE", "ACTION_TYPE", String.valueOf(id), details(actionType));
    }

    private Map<String, Object> details(ActionType actionType) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("code", actionType.getCode());
        details.put("name", actionType.getName());
        details.put("targetTypeId", actionType.getTargetType().getId());
        details.put("executorType", actionType.getExecutorType().name());
        details.put("enabled", actionType.isEnabled());
        return details;
    }

    private ActionExecutorType parseExecutorType(String value) {
        try {
            return ActionExecutorType.valueOf(value.trim().toUpperCase());
        } catch (Exception ex) {
            throw new BusinessException(40043, "执行器类型非法");
        }
    }

    private ActionTypeResponse toResponse(ActionType actionType) {
        return new ActionTypeResponse(
                actionType.getId(),
                actionType.getCode(),
                actionType.getName(),
                actionType.getTargetType().getId(),
                actionType.getTargetType().getCode(),
                actionType.getExecutorType().name(),
                actionType.getParameterSchema(),
                null,
                actionType.getDescription(),
                actionType.isEnabled(),
                actionType.getCreatedAt(),
                actionType.getUpdatedAt()
        );
    }
}
