package com.ontology.backend.repository;

import com.ontology.backend.domain.ObjectSet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjectSetRepository extends JpaRepository<ObjectSet, Long> {

    Page<ObjectSet> findByType_Id(Long typeId, Pageable pageable);
}
