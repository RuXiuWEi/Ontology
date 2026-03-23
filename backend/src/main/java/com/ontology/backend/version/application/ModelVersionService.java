package com.ontology.backend.version.application;

import com.ontology.backend.service.AuditLogService;
import com.ontology.backend.version.domain.ModelVersion;
import com.ontology.backend.version.domain.ModelVersionStatus;
import com.ontology.backend.version.infra.ModelVersionRepository;
import com.ontology.backend.version.web.dto.ModelVersionDraftUpsertRequest;
import com.ontology.backend.version.web.dto.ModelVersionPublishRequest;
import com.ontology.backend.version.web.dto.ModelVersionResponse;
import com.ontology.backend.version.web.dto.ModelVersionRollbackRequest;
import com.ontology.backend.web.BusinessException;
import com.ontology.backend.web.dto.PageResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ModelVersionService {

    private final ModelVersionRepository modelVersionRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public ModelVersionService(
            ModelVersionRepository modelVersionRepository,
            AuditLogService auditLogService,
            ObjectMapper objectMapper
    ) {
        this.modelVersionRepository = modelVersionRepository;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<ModelVersionResponse> list(String modelCode, String status, Pageable pageable) {
        Page<ModelVersion> page;
        boolean hasModelCode = StringUtils.hasText(modelCode);
        boolean hasStatus = StringUtils.hasText(status);
        if (hasModelCode && hasStatus) {
            ModelVersionStatus parsedStatus = parseStatus(status);
            page = modelVersionRepository.findAllByModelCodeAndStatusOrderByVersionNoDescCreatedAtDesc(
                    modelCode.trim(),
                    parsedStatus,
                    pageable
            );
        } else if (hasModelCode) {
            page = modelVersionRepository.findAllByModelCodeOrderByVersionNoDescCreatedAtDesc(modelCode.trim(), pageable);
        } else if (hasStatus) {
            ModelVersionStatus parsedStatus = parseStatus(status);
            page = modelVersionRepository.findAllByStatusOrderByVersionNoDescCreatedAtDesc(parsedStatus, pageable);
        } else {
            page = modelVersionRepository.findAll(pageable);
        }
        Page<ModelVersionResponse> mapped = page.map(this::toResponse);
        return PageResponse.of(mapped);
    }

    @Transactional(readOnly = true)
    public ModelVersionResponse getDraft(String modelCode) {
        if (!StringUtils.hasText(modelCode)) {
            throw new BusinessException(40060, "modelCode 不能为空");
        }
        return modelVersionRepository.findByModelCodeAndStatus(modelCode.trim(), ModelVersionStatus.DRAFT)
                .map(this::toResponse)
                .orElseThrow(() -> new BusinessException(40461, "待发布草稿不存在"));
    }

    @Transactional
    public ModelVersionResponse saveDraft(ModelVersionDraftUpsertRequest request) {
        String operator = resolveOperator();
        String modelCode = request.modelCode().trim();

        ModelVersion draft = modelVersionRepository.findByModelCodeAndStatus(modelCode, ModelVersionStatus.DRAFT)
                .orElseGet(ModelVersion::new);

        if (draft.getId() == null) {
            draft.setModelCode(modelCode);
            draft.setVersionNo(0);
            draft.setStatus(ModelVersionStatus.DRAFT);
            draft.setCreatedBy(operator);
            draft.setCreatedAt(Instant.now());
        }

        draft.setTitle(request.title().trim());
        draft.setContent(toContentJson(request.content()));
        draft.setChangeLog(request.changeLog());
        draft.setUpdatedAt(Instant.now());
        ModelVersion saved = modelVersionRepository.save(draft);
        auditLogService.log("UPSERT_DRAFT", "MODEL_VERSION", String.valueOf(saved.getId()), buildDetails(saved));
        return toResponse(saved);
    }

    @Transactional
    public ModelVersionResponse publish(Long id, ModelVersionPublishRequest request) {
        String operator = resolveOperator();
        ModelVersion draft = modelVersionRepository.findById(id)
                .orElseThrow(() -> new BusinessException(40460, "模型版本不存在"));
        if (draft.getStatus() != ModelVersionStatus.DRAFT) {
            throw new BusinessException(40960, "仅草稿状态可发布");
        }
        validateDraftBeforePublish(draft);

        modelVersionRepository.findByModelCodeAndStatus(draft.getModelCode(), ModelVersionStatus.PUBLISHED)
                .ifPresent(published -> {
                    published.setStatus(ModelVersionStatus.ARCHIVED);
                    published.setUpdatedAt(Instant.now());
                    modelVersionRepository.save(published);
                });

        int latestPublished = modelVersionRepository
                .findFirstByModelCodeAndStatusOrderByVersionNoDesc(draft.getModelCode(), ModelVersionStatus.PUBLISHED)
                .map(ModelVersion::getVersionNo)
                .orElse(0);
        int latestArchived = modelVersionRepository
                .findFirstByModelCodeAndStatusOrderByVersionNoDesc(draft.getModelCode(), ModelVersionStatus.ARCHIVED)
                .map(ModelVersion::getVersionNo)
                .orElse(0);
        int nextVersionNo = Math.max(latestPublished, latestArchived) + 1;

        draft.setStatus(ModelVersionStatus.PUBLISHED);
        draft.setVersionNo(nextVersionNo);
        draft.setPublishedBy(operator);
        draft.setPublishedAt(Instant.now());
        draft.setChangeLog(request.changeLog().trim());
        draft.setUpdatedAt(Instant.now());
        ModelVersion published = modelVersionRepository.save(draft);
        auditLogService.log("PUBLISH", "MODEL_VERSION", String.valueOf(published.getId()), buildDetails(published));
        return toResponse(published);
    }

    @Transactional
    public ModelVersionResponse rollback(ModelVersionRollbackRequest request) {
        if (request.targetVersionNo() == null || request.targetVersionNo() <= 0) {
            throw new BusinessException(40061, "回滚版本号非法");
        }
        if (!StringUtils.hasText(request.modelCode())) {
            throw new BusinessException(40060, "modelCode 不能为空");
        }

        String modelCode = request.modelCode().trim();
        ModelVersion target = modelVersionRepository.findByModelCodeAndVersionNoAndStatus(
                modelCode,
                request.targetVersionNo(),
                ModelVersionStatus.PUBLISHED
        ).orElseGet(() -> modelVersionRepository.findByModelCodeAndVersionNoAndStatus(
                modelCode,
                request.targetVersionNo(),
                ModelVersionStatus.ARCHIVED
        ).orElseThrow(() -> new BusinessException(40462, "目标回滚版本不存在")));

        ModelVersionDraftUpsertRequest draftRequest = new ModelVersionDraftUpsertRequest(
                modelCode,
                target.getTitle(),
                parseContentJson(target.getContent()),
                StringUtils.hasText(request.changeLog()) ? request.changeLog().trim() : "回滚到版本 v" + request.targetVersionNo()
        );
        ModelVersionResponse draft = saveDraft(draftRequest);
        auditLogService.log("ROLLBACK_DRAFT", "MODEL_VERSION", String.valueOf(draft.id()), Map.of(
                "modelCode", modelCode,
                "targetVersionNo", request.targetVersionNo()
        ));
        return draft;
    }

    @Transactional(readOnly = true)
    public ModelVersionResponse get(Long id) {
        return modelVersionRepository.findById(id).map(this::toResponse)
                .orElseThrow(() -> new BusinessException(40460, "模型版本不存在"));
    }

    private String resolveOperator() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || !StringUtils.hasText(authentication.getName())) {
            return "anonymous";
        }
        return authentication.getName();
    }

    private ModelVersionStatus parseStatus(String value) {
        try {
            return ModelVersionStatus.valueOf(value.trim().toUpperCase());
        } catch (Exception ex) {
            throw new BusinessException(40062, "状态非法");
        }
    }

    private Map<String, Object> buildDetails(ModelVersion version) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("modelCode", version.getModelCode());
        details.put("versionNo", version.getVersionNo());
        details.put("status", version.getStatus().name());
        details.put("title", version.getTitle());
        return details;
    }

    private ModelVersionResponse toResponse(ModelVersion version) {
        return new ModelVersionResponse(
                version.getId(),
                version.getModelCode(),
                version.getVersionNo(),
                version.getTitle(),
                parseContentJson(version.getContent()),
                version.getStatus().name(),
                version.getChangeLog(),
                version.getCreatedBy(),
                version.getPublishedBy(),
                version.getPublishedAt(),
                version.getCreatedAt(),
                version.getUpdatedAt()
        );
    }

    private String toContentJson(Map<String, Object> content) {
        try {
            return objectMapper.writeValueAsString(content);
        } catch (JsonProcessingException e) {
            throw new BusinessException(40063, "content 序列化失败");
        }
    }

    private Map<String, Object> parseContentJson(String contentJson) {
        try {
            return objectMapper.readValue(contentJson, new TypeReference<>() {
            });
        } catch (Exception e) {
            throw new BusinessException(50060, "content 反序列化失败");
        }
    }

    private void validateDraftBeforePublish(ModelVersion draft) {
        if (!StringUtils.hasText(draft.getModelCode())) {
            throw new BusinessException(40064, "草稿模型编码非法，禁止发布");
        }
        if (!StringUtils.hasText(draft.getTitle())) {
            throw new BusinessException(40065, "草稿标题不能为空，禁止发布");
        }
        if (!StringUtils.hasText(draft.getContent())) {
            throw new BusinessException(40066, "草稿内容不能为空，禁止发布");
        }
        try {
            Map<String, Object> content = objectMapper.readValue(draft.getContent(), new TypeReference<>() {
            });
            if (content == null || content.isEmpty()) {
                throw new BusinessException(40066, "草稿内容不能为空对象，禁止发布");
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(40067, "草稿内容格式非法，禁止发布");
        }
    }
}
