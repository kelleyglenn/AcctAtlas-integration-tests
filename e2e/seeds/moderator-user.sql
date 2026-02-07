-- Creates a moderator user for testing moderation workflows
-- Password: ModeratorPass123!
--
-- To generate a new bcrypt hash:
--   node -e "console.log(require('bcryptjs').hashSync('ModeratorPass123!', 10))"
--
-- Usage:
--   docker exec acctatlas-postgres psql -U postgres -d acctatlas -f /seeds/moderator-user.sql

INSERT INTO users (id, email, password_hash, display_name, trust_tier, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'moderator@test.local',
  '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq4H5VbMxTqVZPzq1BpKvhFqvD4u5G',
  'Test Moderator',
  'MODERATOR',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;
