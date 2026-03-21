package com.ontology.backend.bootstrap;

import com.ontology.backend.domain.Role;
import com.ontology.backend.repository.RoleRepository;
import com.ontology.backend.security.RoleNames;
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
        admin.setName(RoleNames.ADMIN);
        roleRepository.save(admin);
        Role editor = new Role();
        editor.setName(RoleNames.EDITOR);
        roleRepository.save(editor);
        Role viewer = new Role();
        viewer.setName(RoleNames.VIEWER);
        roleRepository.save(viewer);
    }
}
