package com.ontology.backend.bootstrap;

import com.ontology.backend.domain.Role;
import com.ontology.backend.repository.RoleRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("test")
@Order(1)
public class TestReferenceDataRunner implements ApplicationRunner {

    private final RoleRepository roleRepository;

    public TestReferenceDataRunner(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (roleRepository.count() > 0) {
            return;
        }
        Role admin = new Role();
        admin.setName("ROLE_ADMIN");
        roleRepository.save(admin);
        Role user = new Role();
        user.setName("ROLE_USER");
        roleRepository.save(user);
    }
}
