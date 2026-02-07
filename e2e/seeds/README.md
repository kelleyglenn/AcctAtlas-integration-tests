# Test Data Seeds

SQL scripts for creating test data that cannot be created via the public API.

## Available Seeds

| File | Purpose | Credentials |
|------|---------|-------------|
| `moderator-user.sql` | Creates a MODERATOR tier user | `moderator@test.local` / `ModeratorPass123!` |

## Usage

### Local Development

```bash
docker exec acctatlas-postgres psql -U postgres -d acctatlas -f /path/to/seed.sql
```

### CI

Seeds are mounted into the postgres container and run during test setup.

## Generating Password Hashes

To generate a bcrypt hash for a new password:

```bash
node -e "console.log(require('bcryptjs').hashSync('YourPassword123!', 10))"
```
