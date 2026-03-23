package com.ontology.backend.version.infra;

import com.ontology.backend.version.domain.ModelVersion;
import com.ontology.backend.version.domain.ModelVersionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ModelVersionRepository extends JpaRepository<ModelVersion, Long> {

    Optional<ModelVersion> findByModelCodeAndStatus(String modelCode, ModelVersionStatus status);

    Optional<ModelVersion> findFirstByModelCodeAndStatusOrderByVersionNoDesc(
            String modelCode,
            ModelVersionStatus status
    );

    Optional<ModelVersion> findByModelCodeAndVersionNoAndStatus(
            String modelCode,
            int versionNo,
            ModelVersionStatus status
    );

    Page<ModelVersion> findAllByModelCodeOrderByVersionNoDescCreatedAtDesc(String modelCode, Pageable pageable);

    Page<ModelVersion> findAllByModelCodeAndStatusOrderByVersionNoDescCreatedAtDesc(
            String modelCode,
            ModelVersionStatus status,
            Pageable pageable
    );

    Page<ModelVersion> findAllByStatusOrderByVersionNoDescCreatedAtDesc(
            ModelVersionStatus status,
            Pageable pageable
    );

    boolean existsByModelCodeAndStatus(String modelCode, ModelVersionStatus status);
}
