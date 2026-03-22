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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

    @Test
    void relationModuleShouldEnforceCardinalityAndRestrictDelete() throws Exception {
        long customerTypeId = createObjectType("T_REL_CUSTOMER", "客户");
        long projectTypeId = createObjectType("T_REL_PROJECT", "项目");

        long relationTypeId = createRelationType(
                "REL_CUSTOMER_PROJECT",
                "客户-项目",
                customerTypeId,
                projectTypeId,
                "ONE_TO_ONE",
                "DIRECTED"
        );

        long customerAId = createObjectInstance(customerTypeId, "客户A");
        long projectAId = createObjectInstance(projectTypeId, "项目A");
        long projectBId = createObjectInstance(projectTypeId, "项目B");

        MvcResult createEdgeResult = mockMvc.perform(post("/api/relations")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "relationTypeId": %d,
                                  "sourceInstanceId": %d,
                                  "targetInstanceId": %d
                                }
                                """.formatted(relationTypeId, customerAId, projectAId)))
                .andExpect(status().isOk())
                .andReturn();
        long edgeId = responseData(createEdgeResult).get("id").asLong();

        mockMvc.perform(post("/api/relations")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "relationTypeId": %d,
                                  "sourceInstanceId": %d,
                                  "targetInstanceId": %d
                                }
                                """.formatted(relationTypeId, customerAId, projectBId)))
                .andExpect(status().isConflict());

        MvcResult neighborsResult = mockMvc.perform(get("/api/relations/neighbors")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("instanceId", String.valueOf(customerAId)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode neighbors = responseData(neighborsResult);
        assertThat(neighbors.isArray()).isTrue();
        assertThat(neighbors.size()).isGreaterThanOrEqualTo(1);

        mockMvc.perform(delete("/api/instances/{id}", customerAId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict());

        mockMvc.perform(delete("/api/relation-types/{id}", relationTypeId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict());

        mockMvc.perform(delete("/api/relations/{id}", edgeId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/relation-types/{id}", relationTypeId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void relationModuleShouldRejectTypeMismatch() throws Exception {
        long sourceTypeId = createObjectType("T_REL_SOURCE", "源类型");
        long targetTypeId = createObjectType("T_REL_TARGET", "目标类型");
        long wrongTypeId = createObjectType("T_REL_WRONG", "错误类型");

        long relationTypeId = createRelationType(
                "REL_SOURCE_TARGET",
                "源-目标",
                sourceTypeId,
                targetTypeId,
                "MANY_TO_MANY",
                "DIRECTED"
        );

        long wrongInstanceId = createObjectInstance(wrongTypeId, "错误实例");
        long targetInstanceId = createObjectInstance(targetTypeId, "目标实例");

        mockMvc.perform(post("/api/relations")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "relationTypeId": %d,
                                  "sourceInstanceId": %d,
                                  "targetInstanceId": %d
                                }
                                """.formatted(relationTypeId, wrongInstanceId, targetInstanceId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void actionModuleShouldExecuteRetryAndRestrictDelete() throws Exception {
        long customerTypeId = createObjectType("T_ACT_CUSTOMER", "动作客户");
        long customerInstanceId = createObjectInstance(customerTypeId, "动作客户A");

        long actionTypeId = createActionType(
                "ACT_SYNC_TAG",
                "同步打标",
                customerTypeId,
                "SYNC_MOCK"
        );

        MvcResult execResult = mockMvc.perform(post("/api/action-executions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "actionTypeId": %d,
                                  "targetInstanceId": %d,
                                  "payload": {"tag":"vip"}
                                }
                                """.formatted(actionTypeId, customerInstanceId)))
                .andExpect(status().isOk())
                .andReturn();
        long executionId = responseData(execResult).get("id").asLong();

        MvcResult listResult = mockMvc.perform(get("/api/action-executions")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("actionTypeId", String.valueOf(actionTypeId)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode content = responseData(listResult).get("content");
        assertThat(content.isArray()).isTrue();
        assertThat(content.size()).isGreaterThanOrEqualTo(1);

        mockMvc.perform(post("/api/action-executions/{id}/retry", executionId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict());

        mockMvc.perform(delete("/api/object-types/{id}", customerTypeId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict());

        mockMvc.perform(delete("/api/instances/{id}", customerInstanceId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict());

        mockMvc.perform(delete("/api/action-types/{id}", actionTypeId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict());
    }

    @Test
    void actionModuleShouldRejectTargetTypeMismatch() throws Exception {
        long customerTypeId = createObjectType("T_ACT_SOURCE", "动作源类型");
        long projectTypeId = createObjectType("T_ACT_TARGET", "动作目标类型");
        long customerInstanceId = createObjectInstance(customerTypeId, "客户实例");

        long actionTypeId = createActionType(
                "ACT_VALIDATE_TYPE",
                "校验目标类型",
                projectTypeId,
                "SYNC_MOCK"
        );

        mockMvc.perform(post("/api/action-executions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "actionTypeId": %d,
                                  "targetInstanceId": %d
                                }
                                """.formatted(actionTypeId, customerInstanceId)))
                .andExpect(status().isBadRequest());
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

    private long createObjectType(String code, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/object-types")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code":"%s",
                                  "name":"%s",
                                  "description":"关系测试对象类型"
                                }
                                """.formatted(code, name)))
                .andExpect(status().isOk())
                .andReturn();
        return responseData(result).get("id").asLong();
    }

    private long createObjectInstance(long typeId, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/instances")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "typeId": %d,
                                  "name":"%s"
                                }
                                """.formatted(typeId, name)))
                .andExpect(status().isOk())
                .andReturn();
        return responseData(result).get("id").asLong();
    }

    private long createRelationType(
            String code,
            String name,
            long sourceTypeId,
            long targetTypeId,
            String cardinality,
            String direction
    ) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/relation-types")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code":"%s",
                                  "name":"%s",
                                  "sourceTypeId": %d,
                                  "targetTypeId": %d,
                                  "cardinality":"%s",
                                  "direction":"%s",
                                  "description":"关系测试类型"
                                }
                                """.formatted(code, name, sourceTypeId, targetTypeId, cardinality, direction)))
                .andExpect(status().isOk())
                .andReturn();
        return responseData(result).get("id").asLong();
    }

    private long createActionType(
            String code,
            String name,
            long targetTypeId,
            String executorType
    ) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/action-types")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code":"%s",
                                  "name":"%s",
                                  "targetTypeId": %d,
                                  "executorType":"%s",
                                  "enabled": true,
                                  "parameterSchema":"{\\"type\\":\\"object\\"}",
                                  "description":"动作测试类型"
                                }
                                """.formatted(code, name, targetTypeId, executorType)))
                .andExpect(status().isOk())
                .andReturn();
        return responseData(result).get("id").asLong();
    }
}
