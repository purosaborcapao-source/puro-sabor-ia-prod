-- Migration 009: WhatsApp media support
-- Adds media_url to messages table and updates type enum to support media types.

-- 1. Add media_url column to messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media_url TEXT;

-- 2. Expand message type to support media (messages.type was TEXT, remains TEXT)
-- No enum change needed — type is stored as plain TEXT. Existing values: "text"
-- New values supported: "image", "audio", "document", "video"
-- The column already exists as TEXT per migration 003.

-- 3. Index for media lookups
CREATE INDEX IF NOT EXISTS idx_messages_media_url
  ON messages (media_url)
  WHERE media_url IS NOT NULL;

-- 4. Add sender_name to messages for display
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS sender_name TEXT;

COMMENT ON COLUMN messages.media_url IS 'Public URL for image/audio/document/video messages from Z-API';
COMMENT ON COLUMN messages.sender_name IS 'Display name from WhatsApp (senderName field from Z-API)';
