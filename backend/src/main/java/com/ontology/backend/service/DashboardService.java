package com.ontology.backend.service;

import com.ontology.backend.repository.AuditLogRepository;
import com.ontology.backend.repository.ObjectInstanceRepository;
import com.ontology.backend.repository.ObjectTypeRepository;
import com.ontology.backend.repository.UserRepository;
import com.ontology.backend.web.dto.DashboardDailyPointResponse;
import com.ontology.backend.web.dto.DashboardSummaryResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
public class DashboardService {

    private final ObjectTypeRepository objectTypeRepository;
    private final ObjectInstanceRepository objectInstanceRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public DashboardService(
            ObjectTypeRepository objectTypeRepository,
            ObjectInstanceRepository objectInstanceRepository,
            AuditLogRepository auditLogRepository,
            UserRepository userRepository
    ) {
        this.objectTypeRepository = objectTypeRepository;
        this.objectInstanceRepository = objectInstanceRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary() {
        Instant now = Instant.now();
        Instant last7Days = now.minus(6, ChronoUnit.DAYS).truncatedTo(ChronoUnit.DAYS);
        long totalObjectTypes = objectTypeRepository.count();
        long totalInstances = objectInstanceRepository.count();
        long createdObjectTypesLast7Days = objectTypeRepository.countByCreatedAtBetween(last7Days, now);
        long createdInstancesLast7Days = objectInstanceRepository.countByCreatedAtBetween(last7Days, now);
        long activeUsers = userRepository.countByEnabledTrue();
        long auditEventsLast7Days = auditLogRepository.countByCreatedAtBetween(last7Days, now);
        List<DashboardDailyPointResponse> trend = buildDailyTrend(now);
        return new DashboardSummaryResponse(
                totalObjectTypes,
                createdObjectTypesLast7Days,
                totalInstances,
                createdInstancesLast7Days,
                activeUsers,
                auditEventsLast7Days,
                trend
        );
    }

    private List<DashboardDailyPointResponse> buildDailyTrend(Instant now) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        List<DashboardDailyPointResponse> points = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            Instant start = day.atStartOfDay().toInstant(ZoneOffset.UTC);
            Instant end = day.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            long objectTypes = objectTypeRepository.countByCreatedAtBetween(start, end);
            long instances = objectInstanceRepository.countByCreatedAtBetween(start, end);
            long audits = auditLogRepository.countByCreatedAtBetween(start, end);
            points.add(new DashboardDailyPointResponse(day.toString(), objectTypes, instances, audits));
        }
        return points;
    }
}
