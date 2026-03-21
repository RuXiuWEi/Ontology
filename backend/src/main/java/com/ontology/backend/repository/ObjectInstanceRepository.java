package com.ontology.backend.repository;

import com.ontology.backend.domain.ObjectInstance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;

public interface ObjectInstanceRepository extends JpaRepository<ObjectInstance, Long> {

    Page<ObjectInstance> findByType_Id(Long typeId, Pageable pageable);

    long countByCreatedAtBetween(Instant start, Instant end);
}
