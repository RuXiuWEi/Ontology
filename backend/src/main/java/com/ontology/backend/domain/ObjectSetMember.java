package com.ontology.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "object_set_members")
public class ObjectSetMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "object_set_id", nullable = false)
    private ObjectSet objectSet;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "object_instance_id", nullable = false)
    private ObjectInstance objectInstance;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ObjectSet getObjectSet() {
        return objectSet;
    }

    public void setObjectSet(ObjectSet objectSet) {
        this.objectSet = objectSet;
    }

    public ObjectInstance getObjectInstance() {
        return objectInstance;
    }

    public void setObjectInstance(ObjectInstance objectInstance) {
        this.objectInstance = objectInstance;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
