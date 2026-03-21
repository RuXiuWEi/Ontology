package com.ontology.backend.repository;

import com.ontology.backend.domain.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByName(String name);

    boolean existsByName(String name);

    List<Role> findByNameIn(Collection<String> names);

    List<Role> findAllByOrderByNameAsc();

    List<Role> findAllByNameInOrderByNameAsc(Collection<String> names);
}
