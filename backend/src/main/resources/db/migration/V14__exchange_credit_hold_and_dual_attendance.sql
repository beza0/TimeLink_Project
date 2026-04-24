ALTER TABLE exchange_requests
    ADD COLUMN IF NOT EXISTS requester_credit_held BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE exchange_requests
    ADD COLUMN IF NOT EXISTS owner_attendance_ack_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE exchange_requests
    ADD COLUMN IF NOT EXISTS started_prompt_sent BOOLEAN NOT NULL DEFAULT FALSE;
