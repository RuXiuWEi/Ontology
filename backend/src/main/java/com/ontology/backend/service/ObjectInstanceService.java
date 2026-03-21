package com.ontology.backend.service;

import com.ontology.backend.domain.ObjectInstance;
import com.ontology.backend.domain.ObjectType;
import com.ontology.backend.repository.ObjectInstanceRepository;
import com.ontology.backend.repository.ObjectTypeRepository;
import com.ontology.backend.web.BusinessException;
import com.ontology.backend.web.dto.ObjectInstanceRequest;
import com.ontology.backend.web.dto.ObjectInstanceResponse;
import com.ontology.backend.web.dto.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
public class ObjectInstanceService {

    private final ObjectInstanceRepository instanceRepository;
    private final ObjectTypeRepository typeRepository;

    public ObjectInstanceService(ObjectInstanceRepository instanceRepository, ObjectTypeRepository typeRepository) {
        this.instanceRepository = instanceRepository;
        this.typeRepository = typeRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<ObjectInstanceResponse> list(Optional<Long> typeId, Pageable pageable) {
        Page<ObjectInstance> page = typeId
                .map(id -> instanceRepository.findByType_Id(id, pageable))
                .orElseGet(() -> instanceRepository.findAll(pageable));
        return PageResponse.of(page.map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public ObjectInstanceResponse get(Long id) {
        return instanceRepository.findById(id).map(this::toResponse)
                .orElseThrow(() -> new BusinessException(40402, "对象实例不存在"));
    }

    @Transactional
    public ObjectInstanceResponse create(ObjectInstanceRequest request) {
        ObjectType type = typeRepository.findById(request.typeId())
                .orElseThrow(() -> new BusinessException(40401, "对象类型不存在"));
        ObjectInstance entity = new ObjectInstance();
        entity.setType(type);
        entity.setName(request.name().trim());
        entity.setAttributes(request.attributes());
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        return toResponse(instanceRepository.save(entity));
    }

    @Transactional
    public ObjectInstanceResponse update(Long id, ObjectInstanceRequest request) {
        ObjectInstance entity = instanceRepository.findById(id)
                .orElseThrow(() -> new BusinessException(40402, "对象实例不存在"));
        ObjectType type = typeRepository.findById(request.typeId())
                .orElseThrow(() -> new BusinessException(40401, "对象类型不存在"));
        entity.setType(type);
        entity.setName(request.name().trim());
        entity.setAttributes(request.attributes());
        entity.setUpdatedAt(Instant.now());
        return toResponse(instanceRepository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        if (!instanceRepository.existsById(id)) {
            throw new BusinessException(40402, "对象实例不存在");
        }
        instanceRepository.deleteById(id);
    }

    private ObjectInstanceResponse toResponse(ObjectInstance e) {
        ObjectType t = e.getType();
        return new ObjectInstanceResponse(
                e.getId(),
                t.getId(),
                t.getCode(),
                e.getName(),
                e.getAttributes(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
