package com.ontology.backend.repository;

import com.ontology.backend.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    long countByEnabledTrue();

    org.springframework.data.domain.Page<User> findByUsernameContainingIgnoreCase(
            String username,
            org.springframework.data.domain.Pageable pageable
    );

    @Query("select count(distinct u.id) from User u join u.roles r where r.name = :roleName and u.enabled = true")
    long countEnabledByRoleName(String roleName);
}
