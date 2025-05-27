-- Add loop_enabled column to streams table
ALTER TABLE streams ADD COLUMN loop_enabled BOOLEAN DEFAULT FALSE NOT NULL;

-- Update existing records to have loop_enabled = false
UPDATE streams SET loop_enabled = FALSE WHERE loop_enabled IS NULL;

-- Verify the column was added
DESCRIBE streams;
