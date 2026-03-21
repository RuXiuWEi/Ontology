package com.ontology.backend.audit;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

@Aspect
@Component
public class AuditAspect {

    private static final int DETAILS_MAX = 2000;

    private final AuditService auditService;

    public AuditAspect(AuditService auditService) {
        this.auditService = auditService;
    }

    @Around("execution(* com.ontology.backend.web..*Controller.*(..)) "
            + "&& !execution(* com.ontology.backend.web.AuthController.login(..))")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return pjp.proceed();
        }
        HttpServletRequest request = attrs.getRequest();
        String method = request.getMethod();
        if (!isWrite(method)) {
            return pjp.proceed();
        }
        Object result = pjp.proceed();
        String username = currentUsername();
        String action = method;
        String resource = pjp.getSignature().getDeclaringType().getSimpleName() + "." + pjp.getSignature().getName();
        String details = truncate(request.getMethod() + " " + request.getRequestURI());
        auditService.record(username, action, resource, null, details);
        return result;
    }

    private static boolean isWrite(String method) {
        return "POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method) || "PATCH".equals(method);
    }

    private static String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return auth.getName();
    }

    private static String truncate(String s) {
        if (s == null) {
            return null;
        }
        return s.length() <= DETAILS_MAX ? s : s.substring(0, DETAILS_MAX);
    }
}
