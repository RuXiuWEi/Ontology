package com.ontology.backend.service;

import com.ontology.backend.domain.ObjectType;
import com.ontology.backend.repository.ObjectTypeRepository;
import com.ontology.backend.web.BusinessException;
import com.ontology.backend.web.dto.ObjectTypeRequest;
import com.ontology.backend.web.dto.ObjectTypeResponse;
import com.ontology.backend.web.dto.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class ObjectTypeService {

    private final ObjectTypeRepository repository;

    public ObjectTypeService(ObjectTypeRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public PageResponse<ObjectTypeResponse> list(Pageable pageable) {
        Page<ObjectTypeResponse> page = repository.findAll(pageable).map(this::toResponse);
        return PageResponse.of(page);
    }

    @Transactional(readOnly = true)
    public ObjectTypeResponse get(Long id) {
        return repository.findById(id).map(this::toResponse).orElseThrow(() -> new BusinessException(40401, "对象类型不存在"));
    }

    @Transactional
    public ObjectTypeResponse create(ObjectTypeRequest request) {
        if (repository.existsByCode(request.code())) {
            throw new BusinessException(40901, "code 已存在");
        }
        ObjectType entity = new ObjectType();
        entity.setCode(request.code().trim());
        entity.setName(request.name().trim());
        entity.setDescription(request.description());
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public ObjectTypeResponse update(Long id, ObjectTypeRequest request) {
        ObjectType entity = repository.findById(id).orElseThrow(() -> new BusinessException(40401, "对象类型不存在"));
        if (!entity.getCode().equals(request.code()) && repository.existsByCode(request.code())) {
            throw new BusinessException(40901, "code 已存在");
        }
        entity.setCode(request.code().trim());
        entity.setName(request.name().trim());
        entity.setDescription(request.description());
        entity.setUpdatedAt(Instant.now());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new BusinessException(40401, "对象类型不存在");
        }
        repository.deleteById(id);
    }

    private ObjectTypeResponse toResponse(ObjectType e) {
        return new ObjectTypeResponse(
                e.getId(),
                e.getCode(),
                e.getName(),
                e.getDescription(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
