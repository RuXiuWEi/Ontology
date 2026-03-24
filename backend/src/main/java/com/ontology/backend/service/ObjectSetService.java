package com.ontology.backend.service;

import com.ontology.backend.domain.ObjectInstance;
import com.ontology.backend.domain.ObjectSet;
import com.ontology.backend.domain.ObjectSetMember;
import com.ontology.backend.domain.ObjectType;
import com.ontology.backend.repository.ObjectInstanceRepository;
import com.ontology.backend.repository.ObjectSetMemberRepository;
import com.ontology.backend.repository.ObjectSetRepository;
import com.ontology.backend.repository.ObjectTypeRepository;
import com.ontology.backend.web.BusinessException;
import com.ontology.backend.web.dto.ObjectInstanceResponse;
import com.ontology.backend.web.dto.ObjectSetMembersReplaceRequest;
import com.ontology.backend.web.dto.ObjectSetRequest;
import com.ontology.backend.web.dto.ObjectSetResponse;
import com.ontology.backend.web.dto.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
@Service
public class ObjectSetService {

    private static final String KIND_DYNAMIC = "DYNAMIC";
    private static final String KIND_SNAPSHOT = "SNAPSHOT";
    private static final Set<String> ALLOWED_KINDS = Set.of(KIND_DYNAMIC, KIND_SNAPSHOT);
    private static final Set<String> ALLOWED_RULE_SOURCES = Set.of("MANUAL", "JSON_QUERY");

    private final ObjectSetRepository objectSetRepository;
    private final ObjectSetMemberRepository memberRepository;
    private final ObjectTypeRepository typeRepository;
    private final ObjectInstanceRepository instanceRepository;
    private final AuditLogService auditLogService;

    public ObjectSetService(
            ObjectSetRepository objectSetRepository,
            ObjectSetMemberRepository memberRepository,
            ObjectTypeRepository typeRepository,
            ObjectInstanceRepository instanceRepository,
            AuditLogService auditLogService
    ) {
        this.objectSetRepository = objectSetRepository;
        this.memberRepository = memberRepository;
        this.typeRepository = typeRepository;
        this.instanceRepository = instanceRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ObjectSetResponse> list(Optional<Long> typeId, Pageable pageable) {
        Page<ObjectSet> page = typeId
                .map(id -> objectSetRepository.findByType_Id(id, pageable))
                .orElseGet(() -> objectSetRepository.findAll(pageable));
        return PageResponse.of(page.map(this::toResponseWithCount));
    }

    @Transactional(readOnly = true)
    public ObjectSetResponse get(Long id) {
        ObjectSet entity = objectSetRepository.findById(id)
                .orElseThrow(() -> new BusinessException(40403, "对象集合不存在"));
        return toResponseWithCount(entity);
    }

    @Transactional
    public ObjectSetResponse create(ObjectSetRequest request) {
        ObjectType type = typeRepository.findById(request.typeId())
                .orElseThrow(() -> new BusinessException(40401, "对象类型不存在"));
        validateKindAndSnapshot(request.kind(), request.snapshotAt());
        validateRuleSource(request.ruleSource());

        ObjectSet entity = new ObjectSet();
        entity.setType(type);
        applyRequest(entity, request);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        ObjectSet saved = objectSetRepository.save(entity);
        ObjectSetResponse response = toResponseWithCount(saved);
        auditLogService.log(
                "CREATE",
                "OBJECT_SET",
                String.valueOf(saved.getId()),
                buildDetails(saved, type)
        );
        return response;
    }

    @Transactional
    public ObjectSetResponse update(Long id, ObjectSetRequest request) {
        ObjectSet entity = objectSetRepository.findById(id)
                .orElseThrow(() -> new BusinessException(40403, "对象集合不存在"));
        ObjectType type = typeRepository.findById(request.typeId())
                .orElseThrow(() -> new BusinessException(40401, "对象类型不存在"));
        validateKindAndSnapshot(request.kind(), request.snapshotAt());
        validateRuleSource(request.ruleSource());

        entity.setType(type);
        applyRequest(entity, request);
        entity.setUpdatedAt(Instant.now());
        ObjectSet saved = objectSetRepository.save(entity);
        ObjectSetResponse response = toResponseWithCount(saved);
        auditLogService.log(
                "UPDATE",
                "OBJECT_SET",
                String.valueOf(saved.getId()),
                buildDetails(saved, type)
        );
        return response;
    }

    @Transactional
    public void delete(Long id) {
        ObjectSet entity = objectSetRepository.findById(id)
                .orElseThrow(() -> new BusinessException(40403, "对象集合不存在"));
        objectSetRepository.deleteById(id);
        auditLogService.log(
                "DELETE",
                "OBJECT_SET",
                String.valueOf(id),
                buildDetails(entity, entity.getType())
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<ObjectInstanceResponse> listMembers(Long objectSetId, Pageable pageable) {
        ObjectSet set = objectSetRepository.findById(objectSetId)
                .orElseThrow(() -> new BusinessException(40403, "对象集合不存在"));
        Page<ObjectSetMember> page = memberRepository.findByObjectSet_Id(objectSetId, pageable);
        return PageResponse.of(page.map(m -> toInstanceResponse(m.getObjectInstance(), set)));
    }

    @Transactional
    public void replaceMembers(Long objectSetId, ObjectSetMembersReplaceRequest request) {
        ObjectSet set = objectSetRepository.findById(objectSetId)
                .orElseThrow(() -> new BusinessException(40403, "对象集合不存在"));
        Long typeId = set.getType().getId();
        List<Long> ids = request.instanceIds() == null ? List.of() : request.instanceIds();
        Set<Long> unique = new LinkedHashSet<>(ids);
        if (unique.size() != ids.size()) {
            throw new BusinessException(40003, "实例 ID 列表存在重复");
        }
        for (Long instanceId : unique) {
            ObjectInstance inst = instanceRepository.findById(instanceId)
                    .orElseThrow(() -> new BusinessException(40402, "对象实例不存在: " + instanceId));
            if (!inst.getType().getId().equals(typeId)) {
                throw new BusinessException(40004, "实例 " + instanceId + " 不属于该集合绑定的对象类型");
            }
        }
        memberRepository.deleteByObjectSet_Id(objectSetId);
        for (Long instanceId : unique) {
            ObjectInstance inst = instanceRepository.getReferenceById(instanceId);
            ObjectSetMember row = new ObjectSetMember();
            row.setObjectSet(set);
            row.setObjectInstance(inst);
            row.setCreatedAt(Instant.now());
            memberRepository.save(row);
        }
        set.setUpdatedAt(Instant.now());
        objectSetRepository.save(set);
        auditLogService.log(
                "UPDATE",
                "OBJECT_SET_MEMBERS",
                String.valueOf(objectSetId),
                "replaced member count=" + unique.size()
        );
    }

    private void validateKindAndSnapshot(String kind, Instant snapshotAt) {
        if (!ALLOWED_KINDS.contains(kind)) {
            throw new BusinessException(40001, "kind 必须为 DYNAMIC 或 SNAPSHOT");
        }
        if (KIND_SNAPSHOT.equals(kind) && snapshotAt == null) {
            throw new BusinessException(40002, "快照集合必须提供 snapshotAt");
        }
        if (KIND_DYNAMIC.equals(kind) && snapshotAt != null) {
            throw new BusinessException(40005, "动态集合不应设置 snapshotAt");
        }
    }

    private void validateRuleSource(String ruleSource) {
        if (!ALLOWED_RULE_SOURCES.contains(ruleSource)) {
            throw new BusinessException(40006, "ruleSource 必须为 MANUAL 或 JSON_QUERY");
        }
    }

    private void applyRequest(ObjectSet entity, ObjectSetRequest request) {
        entity.setName(request.name().trim());
        entity.setDescription(request.description());
        entity.setKind(request.kind());
        entity.setRuleExpression(request.ruleExpression());
        entity.setRuleSource(request.ruleSource());
        entity.setSnapshotAt(request.snapshotAt());
        entity.setOwner(request.owner());
        entity.setNotes(request.notes());
    }

    private ObjectSetResponse toResponseWithCount(ObjectSet e) {
        long count = memberRepository.countByObjectSet_Id(e.getId());
        return toResponse(e, count);
    }

    private ObjectSetResponse toResponse(ObjectSet e, long memberCount) {
        ObjectType t = e.getType();
        return new ObjectSetResponse(
                e.getId(),
                t.getId(),
                t.getCode(),
                e.getName(),
                e.getDescription(),
                e.getKind(),
                e.getRuleExpression(),
                e.getRuleSource(),
                e.getSnapshotAt(),
                e.getOwner(),
                e.getNotes(),
                memberCount,
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }

    private ObjectInstanceResponse toInstanceResponse(ObjectInstance inst, ObjectSet set) {
        if (!inst.getType().getId().equals(set.getType().getId())) {
            throw new BusinessException(50001, "成员与集合类型不一致");
        }
        ObjectType t = inst.getType();
        return new ObjectInstanceResponse(
                inst.getId(),
                t.getId(),
                t.getCode(),
                inst.getName(),
                inst.getAttributes(),
                inst.getCreatedAt(),
                inst.getUpdatedAt()
        );
    }

    private Map<String, Object> buildDetails(ObjectSet set, ObjectType type) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("name", set.getName());
        details.put("typeId", type.getId());
        details.put("typeCode", type.getCode());
        details.put("kind", set.getKind());
        details.put("ruleSource", set.getRuleSource());
        return details;
    }
}
