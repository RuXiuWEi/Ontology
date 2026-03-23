package com.ontology.backend.action.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ontology.backend.action.domain.ActionExecution;
import com.ontology.backend.action.domain.ActionExecutionStatus;
import com.ontology.backend.action.domain.ActionType;
import com.ontology.backend.action.infra.ActionExecutionRepository;
import com.ontology.backend.action.infra.ActionTypeRepository;
import com.ontology.backend.action.web.dto.ActionExecutionResponse;
import com.ontology.backend.action.web.dto.ExecuteActionRequest;
import com.ontology.backend.domain.ObjectInstance;
import com.ontology.backend.repository.ObjectInstanceRepository;
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
import java.util.Optional;

@Service
public class ActionExecutionService {

    private final ActionExecutionRepository actionExecutionRepository;
    private final ActionTypeRepository actionTypeRepository;
    private final ObjectInstanceRepository objectInstanceRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final ActionParameterSchemaValidator actionParameterSchemaValidator;

    public ActionExecutionService(
            ActionExecutionRepository actionExecutionRepository,
            ActionTypeRepository actionTypeRepository,
            ObjectInstanceRepository objectInstanceRepository,
            AuditLogService auditLogService,
            ObjectMapper objectMapper,
            ActionParameterSchemaValidator actionParameterSchemaValidator
    ) {
        this.actionExecutionRepository = actionExecutionRepository;
        this.actionTypeRepository = actionTypeRepository;
        this.objectInstanceRepository = objectInstanceRepository;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
        this.actionParameterSchemaValidator = actionParameterSchemaValidator;
    }

    @Transactional(readOnly = true)
    public PageResponse<ActionExecutionResponse> list(Optional<Long> actionTypeId, Pageable pageable) {
        Page<ActionExecutionResponse> page = actionTypeId
                .map(id -> actionExecutionRepository.findByActionType_Id(id, pageable))
                .orElseGet(() -> actionExecutionRepository.findAll(pageable))
                .map(this::toResponse);
        return PageResponse.of(page);
    }

    @Transactional(readOnly = true)
    public ActionExecutionResponse get(Long id) {
        return actionExecutionRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new BusinessException(40431, "动作执行记录不存在"));
    }

    @Transactional
    public ActionExecutionResponse execute(ExecuteActionRequest request) {
        ActionType actionType = actionTypeRepository.findById(request.actionTypeId())
                .orElseThrow(() -> new BusinessException(40430, "动作类型不存在"));
        if (!actionType.isEnabled()) {
            throw new BusinessException(40941, "动作类型已停用");
        }

        ObjectInstance instance = objectInstanceRepository.findById(request.targetInstanceId())
                .orElseThrow(() -> new BusinessException(40402, "目标对象实例不存在"));
        if (!actionType.getTargetType().getId().equals(instance.getType().getId())) {
            throw new BusinessException(40040, "动作目标实例类型不匹配");
        }
        actionParameterSchemaValidator.validatePayload(actionType.getParameterSchema(), request.payload());

        ActionExecution execution = new ActionExecution();
        execution.setActionType(actionType);
        execution.setTargetInstance(instance);
        execution.setInputPayload(toJson(request.payload()));
        execution.setStatus(ActionExecutionStatus.PENDING);
        execution.setAttemptNo(1);
        execution.setCreatedAt(Instant.now());
        execution.setUpdatedAt(Instant.now());
        execution.setStartedAt(Instant.now());
        execution.setStatus(ActionExecutionStatus.RUNNING);

        try {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("echoPayload", request.payload());
            result.put("actionCode", actionType.getCode());
            result.put("targetInstanceId", instance.getId());

            execution.setResultPayload(toJson(result));
            execution.setCompletedAt(Instant.now());
            execution.setStatus(ActionExecutionStatus.SUCCEEDED);
            execution.setErrorMessage(null);
        } catch (RuntimeException ex) {
            execution.setCompletedAt(Instant.now());
            execution.setStatus(ActionExecutionStatus.FAILED);
            execution.setErrorMessage(ex.getMessage());
        }
        execution.setUpdatedAt(Instant.now());

        ActionExecution saved = actionExecutionRepository.save(execution);
        auditLogService.log("CREATE", "ACTION_EXECUTION", String.valueOf(saved.getId()), details(saved));
        return toResponse(saved);
    }

    @Transactional
    public ActionExecutionResponse retry(Long id) {
        ActionExecution existing = actionExecutionRepository.findById(id)
                .orElseThrow(() -> new BusinessException(40431, "动作执行记录不存在"));
        if (existing.getStatus() != ActionExecutionStatus.FAILED) {
            throw new BusinessException(40942, "仅失败状态允许重试");
        }
        existing.setStatus(ActionExecutionStatus.RUNNING);
        existing.setAttemptNo(existing.getAttemptNo() + 1);
        existing.setStartedAt(Instant.now());
        existing.setCompletedAt(Instant.now());
        existing.setStatus(ActionExecutionStatus.SUCCEEDED);
        existing.setErrorMessage(null);
        existing.setUpdatedAt(Instant.now());
        ActionExecution saved = actionExecutionRepository.save(existing);
        auditLogService.log("UPDATE", "ACTION_EXECUTION", String.valueOf(saved.getId()), details(saved));
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public boolean hasExecutionsForActionType(Long actionTypeId) {
        return actionExecutionRepository.existsByActionType_Id(actionTypeId);
    }

    private String toJson(Object payload) {
        if (payload == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new BusinessException(40041, "动作参数序列化失败");
        }
    }

    private Map<String, Object> parseJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception ex) {
            return Map.of("raw", json);
        }
    }

    private Map<String, Object> details(ActionExecution execution) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("actionTypeId", execution.getActionType().getId());
        details.put("actionCode", execution.getActionType().getCode());
        details.put("targetInstanceId", execution.getTargetInstance().getId());
        details.put("status", execution.getStatus().name());
        details.put("inputPayload", parseJson(execution.getInputPayload()));
        details.put("resultPayload", parseJson(execution.getResultPayload()));
        details.put("errorMessage", execution.getErrorMessage());
        details.put("attemptNo", execution.getAttemptNo());
        return details;
    }

    private ActionExecutionResponse toResponse(ActionExecution execution) {
        return new ActionExecutionResponse(
                execution.getId(),
                execution.getActionType().getId(),
                execution.getActionType().getCode(),
                execution.getActionType().getName(),
                execution.getTargetInstance().getId(),
                execution.getTargetInstance().getName(),
                execution.getStatus(),
                parseJson(execution.getInputPayload()),
                parseJson(execution.getResultPayload()),
                execution.getErrorMessage(),
                execution.getStartedAt(),
                execution.getCompletedAt(),
                execution.getCreatedAt(),
                execution.getUpdatedAt()
        );
    }
}
