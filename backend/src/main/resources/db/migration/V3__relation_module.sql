CREATE TABLE relation_types (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    source_type_id BIGINT NOT NULL REFERENCES object_types (id) ON DELETE RESTRICT,
    target_type_id BIGINT NOT NULL REFERENCES object_types (id) ON DELETE RESTRICT,
    cardinality VARCHAR(32) NOT NULL,
    direction VARCHAR(32) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_relation_types_source_type_id ON relation_types (source_type_id);
CREATE INDEX idx_relation_types_target_type_id ON relation_types (target_type_id);

CREATE TABLE relation_edges (
    id BIGSERIAL PRIMARY KEY,
    relation_type_id BIGINT NOT NULL REFERENCES relation_types (id) ON DELETE RESTRICT,
    source_instance_id BIGINT NOT NULL REFERENCES object_instances (id) ON DELETE RESTRICT,
    target_instance_id BIGINT NOT NULL REFERENCES object_instances (id) ON DELETE RESTRICT,
    attributes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_relation_edges_type_source_target UNIQUE (relation_type_id, source_instance_id, target_instance_id)
);

CREATE INDEX idx_relation_edges_relation_type_id ON relation_edges (relation_type_id);
CREATE INDEX idx_relation_edges_source_instance_id ON relation_edges (source_instance_id);
CREATE INDEX idx_relation_edges_target_instance_id ON relation_edges (target_instance_id);
