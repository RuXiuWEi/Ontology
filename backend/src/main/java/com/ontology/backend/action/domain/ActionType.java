package com.ontology.backend.action.domain;

import com.ontology.backend.domain.ObjectType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "action_types")
public class ActionType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_type_id", nullable = false)
    private ObjectType targetType;

    @Enumerated(EnumType.STRING)
    @Column(name = "executor_type", nullable = false, length = 32)
    private ActionExecutorType executorType;

    @Column(name = "parameter_schema", columnDefinition = "text")
    private String parameterSchema;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ObjectType getTargetType() {
        return targetType;
    }

    public void setTargetType(ObjectType targetType) {
        this.targetType = targetType;
    }

    public ActionExecutorType getExecutorType() {
        return executorType;
    }

    public void setExecutorType(ActionExecutorType executorType) {
        this.executorType = executorType;
    }

    public String getParameterSchema() {
        return parameterSchema;
    }

    public void setParameterSchema(String parameterSchema) {
        this.parameterSchema = parameterSchema;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
