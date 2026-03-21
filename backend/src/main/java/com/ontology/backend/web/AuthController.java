package com.ontology.backend.web;

import com.ontology.backend.domain.User;
import com.ontology.backend.repository.UserRepository;
import com.ontology.backend.service.AuthService;
import com.ontology.backend.web.dto.LoginRequest;
import com.ontology.backend.web.dto.LoginResponse;
import com.ontology.backend.web.dto.MeResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ApiResponse<MeResponse> me(@AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new BusinessException(40403, "用户不存在"));
        var roles = user.getRoles().stream().map(r -> r.getName()).toList();
        return ApiResponse.ok(new MeResponse(user.getId(), user.getUsername(), roles));
    }
}
