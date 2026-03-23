CREATE TABLE model_versions (
    id BIGSERIAL PRIMARY KEY,
    model_code VARCHAR(64) NOT NULL,
    version_no INTEGER NOT NULL DEFAULT 0,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    change_log TEXT,
    created_by VARCHAR(64),
    published_by VARCHAR(64),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_model_versions_model_code ON model_versions (model_code);
CREATE INDEX idx_model_versions_status ON model_versions (status);
CREATE INDEX idx_model_versions_published_at ON model_versions (published_at);

CREATE UNIQUE INDEX uq_model_versions_model_code_version_no
    ON model_versions (model_code, version_no)
    WHERE status <> 'DRAFT';

CREATE UNIQUE INDEX uq_model_versions_model_code_active_draft
    ON model_versions (model_code)
    WHERE status = 'DRAFT';
