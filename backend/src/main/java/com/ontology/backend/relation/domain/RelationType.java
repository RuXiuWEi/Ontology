package com.ontology.backend.relation.domain;

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
@Table(name = "relation_types")
public class RelationType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_type_id", nullable = false)
    private ObjectType sourceType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_type_id", nullable = false)
    private ObjectType targetType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private RelationCardinality cardinality;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private RelationDirection direction;

    @Column(columnDefinition = "text")
    private String description;

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

    public ObjectType getSourceType() {
        return sourceType;
    }

    public void setSourceType(ObjectType sourceType) {
        this.sourceType = sourceType;
    }

    public ObjectType getTargetType() {
        return targetType;
    }

    public void setTargetType(ObjectType targetType) {
        this.targetType = targetType;
    }

    public RelationCardinality getCardinality() {
        return cardinality;
    }

    public void setCardinality(RelationCardinality cardinality) {
        this.cardinality = cardinality;
    }

    public RelationDirection getDirection() {
        return direction;
    }

    public void setDirection(RelationDirection direction) {
        this.direction = direction;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
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
