package com.ontology.backend.repository;

import com.ontology.backend.domain.ObjectType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface ObjectTypeRepository extends JpaRepository<ObjectType, Long> {

    Optional<ObjectType> findByCode(String code);

    boolean existsByCode(String code);

    long countByCreatedAtBetween(Instant start, Instant end);
}
