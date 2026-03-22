CREATE TABLE action_types (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    target_type_id BIGINT NOT NULL REFERENCES object_types (id) ON DELETE RESTRICT,
    executor_type VARCHAR(32) NOT NULL,
    parameter_schema TEXT,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_action_types_target_type_id ON action_types (target_type_id);

CREATE TABLE action_executions (
    id BIGSERIAL PRIMARY KEY,
    action_type_id BIGINT NOT NULL REFERENCES action_types (id) ON DELETE RESTRICT,
    target_instance_id BIGINT NOT NULL REFERENCES object_instances (id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL,
    attempt_no INTEGER NOT NULL DEFAULT 1,
    input_payload TEXT,
    result_payload TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_action_executions_action_type_id ON action_executions (action_type_id);
CREATE INDEX idx_action_executions_target_instance_id ON action_executions (target_instance_id);
CREATE INDEX idx_action_executions_status ON action_executions (status);
CREATE INDEX idx_action_executions_created_at ON action_executions (created_at);
