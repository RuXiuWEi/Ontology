CREATE TABLE object_sets (
    id BIGSERIAL PRIMARY KEY,
    type_id BIGINT NOT NULL REFERENCES object_types (id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    kind VARCHAR(32) NOT NULL,
    rule_expression TEXT,
    rule_source VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
    snapshot_at TIMESTAMPTZ,
    owner VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_object_sets_kind CHECK (kind IN ('DYNAMIC', 'SNAPSHOT')),
    CONSTRAINT chk_object_sets_rule_source CHECK (rule_source IN ('MANUAL', 'JSON_QUERY')),
    CONSTRAINT chk_object_sets_snapshot CHECK (
        (kind = 'SNAPSHOT' AND snapshot_at IS NOT NULL)
        OR (kind = 'DYNAMIC')
    )
);

CREATE INDEX idx_object_sets_type_id ON object_sets (type_id);

CREATE TABLE object_set_members (
    id BIGSERIAL PRIMARY KEY,
    object_set_id BIGINT NOT NULL REFERENCES object_sets (id) ON DELETE CASCADE,
    object_instance_id BIGINT NOT NULL REFERENCES object_instances (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (object_set_id, object_instance_id)
);

CREATE INDEX idx_object_set_members_set_id ON object_set_members (object_set_id);
CREATE INDEX idx_object_set_members_instance_id ON object_set_members (object_instance_id);
