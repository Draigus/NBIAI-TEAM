-- 067_position_question_templates.sql
-- Position-level interview question templates

CREATE TABLE position_question_templates (
  position_id UUID NOT NULL REFERENCES hiring_positions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_question_bank(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (position_id, question_id)
);

CREATE INDEX idx_pqt_position ON position_question_templates(position_id);

ALTER TABLE interview_configs ADD COLUMN from_template BOOLEAN NOT NULL DEFAULT false;
