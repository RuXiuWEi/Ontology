package com.ontology.backend.service;

import com.ontology.backend.domain.Role;
import com.ontology.backend.domain.User;
import com.ontology.backend.repository.RoleRepository;
import com.ontology.backend.repository.UserRepository;
import com.ontology.backend.security.RoleNames;
import com.ontology.backend.web.BusinessException;
import com.ontology.backend.web.dto.AssignRolesRequest;
import com.ontology.backend.web.dto.PageResponse;
import com.ontology.backend.web.dto.RoleResponse;
import com.ontology.backend.web.dto.UserSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RbacService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditLogService auditLogService;
    private static final Map<String, Integer> ROLE_ORDER = new LinkedHashMap<>();

    static {
        ROLE_ORDER.put(RoleNames.ADMIN, 0);
        ROLE_ORDER.put(RoleNames.EDITOR, 1);
        ROLE_ORDER.put(RoleNames.VIEWER, 2);
    }

    public RbacService(UserRepository userRepository, RoleRepository roleRepository, AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public PageResponse<UserSummaryResponse> listUsers(String username, org.springframework.data.domain.Pageable pageable) {
        Page<User> usersPage;
        if (username == null || username.isBlank()) {
            usersPage = userRepository.findAll(pageable);
        } else {
            usersPage = userRepository.findByUsernameContainingIgnoreCase(username.trim(), pageable);
        }
        return PageResponse.of(usersPage.map(this::toUserSummary));
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> listRoles() {
        return roleRepository.findAllByOrderByNameAsc().stream().map(this::toRoleResponse).toList();
    }

    @Transactional
    public UserSummaryResponse assignRoles(Long userId, AssignRolesRequest request) {
        List<String> roleNames = request.roles();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(40403, "用户不存在"));
        if (roleNames == null || roleNames.isEmpty()) {
            throw new BusinessException(40011, "至少分配一个角色");
        }

        Set<String> normalized = roleNames.stream()
                .filter(v -> v != null && !v.isBlank())
                .map(String::trim)
                .map(String::toUpperCase)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (normalized.isEmpty()) {
            throw new BusinessException(40011, "至少分配一个角色");
        }
        if (!RoleNames.BUILTIN.containsAll(normalized)) {
            throw new BusinessException(40012, "包含非法角色");
        }

        List<Role> roles = roleRepository.findAllByNameInOrderByNameAsc(normalized);
        if (roles.size() != normalized.size()) {
            throw new BusinessException(40013, "角色不存在");
        }

        user.getRoles().clear();
        user.getRoles().addAll(roles);
        user.setUpdatedAt(Instant.now());
        User saved = userRepository.save(user);

        auditLogService.log(
                "UPDATE",
                "RBAC_ASSIGNMENT",
                String.valueOf(saved.getId()),
                Map.of("username", saved.getUsername(), "roles", roleNamesOf(saved))
        );
        return toUserSummary(saved);
    }

    private UserSummaryResponse toUserSummary(User user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.isEnabled(),
                roleNamesOf(user),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private RoleResponse toRoleResponse(Role role) {
        return new RoleResponse(role.getId(), role.getName());
    }

    private List<String> roleNamesOf(User user) {
        return user.getRoles().stream()
                .map(Role::getName)
                .sorted((a, b) -> Integer.compare(
                        ROLE_ORDER.getOrDefault(a, Integer.MAX_VALUE),
                        ROLE_ORDER.getOrDefault(b, Integer.MAX_VALUE)
                ))
                .toList();
    }
}
