# EnlaceVRC Database API

## 📋 Description

**EnlaceVRC Database API** is a backend service built with **Cloudflare Workers** that provides a REST API for managing VRChat user profiles, Discord server configurations, and administrative staff.

### Key Features:
- 🔐 API Key authentication
- 👤 Profile management (create, list, update, delete, ban, verify)
- 💬 Discord server configuration
- 👨‍💼 Administrative staff management
- 📊 SQLite database with D1 (Cloudflare)
- 🧪 Complete test suite with Vitest

> Yes, I want to use emojis in my personal project

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 18+
npm or yarn
Cloudflare account with Workers access
```

### Installation
```bash
# Clone the repository
git clone https://github.com/tu-usuario/enlacevrc-db.git
cd enlacevrc-db

# Install dependencies
npm install

# Generate API Key
npm run generate-key

# Configure environment variable
npx wrangler secret put API_KEY
```

### Local Development
```bash
# Run local server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

---

## 📚 Usage Examples

### 1. Create a New Profile

```bash
curl -X POST http://localhost:8787/profile/new \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Discord-ID: 123456789" \
  -H "X-Discord-Name: YourUsername" \
  -H "Content-Type: application/json" \
  -d '{
    "vrchat_id": "usr_12345",
    "vrchat_name": "VRChatUser",
    "discord_id": "123456789"
  }'
```

**Successful Response (201):**
```json
{
  "success": true,
  "message": "Profile created successfully"
}
```

### 2. Get User Profile

```bash
curl -X GET http://localhost:8787/profile/usr_12345/get \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Discord-ID: 123456789" \
  -H "X-Discord-Name: YourUsername"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile_id": 1,
    "vrchat_id": "usr_12345",
    "vrchat_name": "VRChatUser",
    "discord_id": "123456789",
    "is_verified": false,
    "is_banned": false,
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### 3. Verify a Profile (requires staff permissions)

```bash
curl -X PUT http://localhost:8787/profile/usr_12345/verify \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Discord-ID: 987654321" \
  -H "X-Discord-Name: AdminUser" \
  -H "Content-Type: application/json" \
  -d '{
    "verification_type_id": 1
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Profile verified successfully"
}
```

---

## 📖 Project Structure

```
src/
├── profile/          # Profile management endpoints
├── discord/          # Discord configuration endpoints
├── staff/            # Staff management endpoints
├── middleware/       # Authentication and middlewares
├── models.ts         # Data interfaces
├── responses.ts      # Response helper functions
└── index.ts          # Main entry point

db/
├── schema.sql        # Database structure
├── poblate.sql       # Sample data
└── test.sql          # Test data

test/                 # Test suite
```

---

## 🔑 Required Headers

| Header | Description | Example |
|--------|-------------|---------|
| `Authorization` | Bearer token with API Key | `Bearer abc123def456...` |
| `X-Discord-ID` | Discord user ID | `123456789` |
| `X-Discord-Name` | Discord username | `YourUsername` |

---

## 📝 Main Endpoints

**Profiles:**
- `POST /profile/new` - Create profile
- `GET /profile/list` - List all profiles
- `GET /profile/{id}/get` - Get specific profile
- `PUT /profile/{id}/ban` - Ban profile
- `PUT /profile/{id}/verify` - Verify profile
- `PUT /profile/{id}/unban` - Unban profile
- `PUT /profile/{id}/unverify` - Unverify profile
- `DELETE /profile/{id}/delete` - Delete profile

**Discord:**
- `POST /discord/{SERVER_ID}/new` - Create configuration
- `GET /discord/{SERVER_ID}/get` - Get configuration
- `PUT /discord/{SERVER_ID}/update` - Update configuration
- `GET /discord/{SERVER_ID}/exists` - Check if configuration exists
- `DELETE /discord/{SERVER_ID}/delete` - Delete configuration
- `GET /discord/{SERVER_ID}/list` - List all configurations

**Staff:**
- `POST /staff/new` - Create staff member
- `GET /staff/{DISCORD_ID}/get` - Get staff information
- `GET /staff/list` - List all staff members
- `PUT /staff/{DISCORD_ID}/update` - Update staff name
- `DELETE /staff/{DISCORD_ID}/delete` - Delete staff member

See [`ENDPOINTS.md`](ENDPOINTS.md) for complete documentation.

---

## 📦 Tech Stack

- **Runtime:** Cloudflare Workers
- **Language:** TypeScript
- **Database:** D1 (SQLite on Cloudflare)
- **Testing:** Vitest
- **Build:** esbuild (via wrangler)

---

## 📄 License

MIT © 2025 Vicente
