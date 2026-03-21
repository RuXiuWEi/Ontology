package com.ontology.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ontology.backend.domain.Role;
import com.ontology.backend.domain.User;
import com.ontology.backend.repository.RoleRepository;
import com.ontology.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.HashSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RegressionIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminToken;
    private Long targetUserId;

    @BeforeEach
    void setup() throws Exception {
        userRepository.deleteAll();

        Role adminRole = roleRepository.findByName("ADMIN").orElseThrow();
        Role editorRole = roleRepository.findByName("EDITOR").orElseThrow();
        Role viewerRole = roleRepository.findByName("VIEWER").orElseThrow();

        User admin = new User();
        admin.setUsername("it_admin");
        admin.setPasswordHash(passwordEncoder.encode("admin123"));
        admin.setEnabled(true);
        admin.setCreatedAt(Instant.now());
        admin.setUpdatedAt(Instant.now());
        admin.setRoles(new HashSet<>());
        admin.getRoles().add(adminRole);
        userRepository.save(admin);

        User target = new User();
        target.setUsername("it_viewer");
        target.setPasswordHash(passwordEncoder.encode("viewer123"));
        target.setEnabled(true);
        target.setCreatedAt(Instant.now());
        target.setUpdatedAt(Instant.now());
        target.setRoles(new HashSet<>());
        target.getRoles().add(viewerRole);
        userRepository.save(target);
        targetUserId = target.getId();

        adminToken = loginAndGetToken("it_admin", "admin123");
        assertThat(editorRole.getName()).isEqualTo("EDITOR");
    }

    @Test
    void dashboardAuditAndCrudShouldLinkTogether() throws Exception {
        MvcResult createTypeResult = mockMvc.perform(post("/api/object-types")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code":"T_IT_A",
                                  "name":"测试类型A",
                                  "description":"回归测试类型"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode createTypeJson = responseData(createTypeResult);
        long typeId = createTypeJson.get("id").asLong();

        mockMvc.perform(post("/api/instances")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "typeId": %d,
                                  "name":"测试实例A",
                                  "attributes":{"k":"v","n":1}
                                }
                                """.formatted(typeId)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/dashboard/summary")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("dimension", "OBJECT_TYPE"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/dashboard/summary")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("dimension", "OBJECT_INSTANCE"))
                .andExpect(status().isOk());

        MvcResult listAuditResult = mockMvc.perform(get("/api/audit-logs")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("resource", "OBJECT_TYPE")
                        .param("preset", "LAST_30_DAYS")
                        .param("size", "50"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode listAuditData = responseData(listAuditResult);
        JsonNode auditContent = listAuditData.get("content");
        assertThat(auditContent.isArray()).isTrue();
        assertThat(auditContent.size()).isGreaterThan(0);

        mockMvc.perform(get("/api/audit-logs/export")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("preset", "LAST_7_DAYS"))
                .andExpect(status().isOk());
    }

    @Test
    void rbacAssignmentShouldTakeEffectAndBeAudited() throws Exception {
        mockMvc.perform(put("/api/rbac/users/{id}/roles", targetUserId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roles":["EDITOR","VIEWER"]
                                }
                                """))
                .andExpect(status().isOk());

        MvcResult usersResult = mockMvc.perform(get("/api/rbac/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("username", "it_viewer"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode usersData = responseData(usersResult).get("content");
        assertThat(usersData.isArray()).isTrue();
        assertThat(usersData.size()).isEqualTo(1);
        JsonNode roles = usersData.get(0).get("roles");
        assertThat(roles.toString()).contains("EDITOR").contains("VIEWER");

        MvcResult auditResult = mockMvc.perform(get("/api/audit-logs")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("resource", "RBAC_ASSIGNMENT")
                        .param("preset", "LAST_30_DAYS")
                        .param("size", "50"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode auditContent = responseData(auditResult).get("content");
        assertThat(auditContent.isArray()).isTrue();
        assertThat(auditContent.size()).isGreaterThan(0);
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"%s",
                                  "password":"%s"
                                }
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").path("accessToken").asText();
    }

    private JsonNode responseData(MvcResult result) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.get("data");
    }
}
