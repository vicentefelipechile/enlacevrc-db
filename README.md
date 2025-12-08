# EnlaceVRC Database API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![D1 Database](https://img.shields.io/badge/Database-D1_(SQLite)-F38020?logo=sqlite&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Swagger UI](https://img.shields.io/badge/Docs-Swagger_UI-85EA2D?logo=swagger&logoColor=black)](https://enlacevrc-db.vicentefelipechile.workers.dev/docs)
[![API Documentation](https://img.shields.io/badge/API-OpenAPI_3.0-6BA539?logo=openapiinitiative&logoColor=white)](https://enlacevrc-db.vicentefelipechile.workers.dev/openapi.json)
[![Vitest](https://img.shields.io/badge/Testing-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)


## 📋 Description

**EnlaceVRC Database API** is a backend service built with **Cloudflare Workers** that provides a REST API for managing VRChat user profiles, Discord server configurations, and administrative staff.

### Key Features:
- 🔐 API Key authentication
- 👤 Profile management (create, list, update, delete, ban, verify)
- 💬 Discord server configuration
- 👨‍💼 Administrative staff management
- 📊 SQLite database with D1 (Cloudflare)
- 🧪 Complete test suite with Vitest
- 📖 **Interactive API Documentation with Swagger UI**

> Yes, I want to use emojis in my personal project

---

## 📖 API Documentation

This API includes **interactive documentation** powered by Swagger UI:

- **Swagger UI**: [Docs](https://enlacevrc-db.vicentefelipechile.workers.dev/docs)
- **OpenAPI Spec**: [Spec](https://enlacevrc-db.vicentefelipechile.workers.dev/openapi.json)

### Features:
- 🧪 **Try it out**: Test endpoints directly from your browser
- 📋 **Request/Response Examples**: See example payloads for all endpoints
- 🔍 **Schema Explorer**: Browse all data models and their properties
- 🔐 **Authentication**: Configure API key and headers in the UI

![Swagger UI](https://img.shields.io/badge/Docs-Swagger_UI-85EA2D?logo=swagger&logoColor=black)

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
git clone https://github.com/vicentefelipechile/enlacevrc-db.git
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

# View API documentation
# Open http://localhost:8787/docs in your browser

# Run tests
npm run test

# Build for production
npm run build
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

## 📦 Tech Stack

- **Runtime:** Cloudflare Workers
- **Language:** TypeScript
- **Database:** D1 (SQLite on Cloudflare)
- **Testing:** Vitest
- **Build:** esbuild (via wrangler)
- **API Documentation:** Swagger UI

---

## 📄 License

MIT © 2025 Vicente
