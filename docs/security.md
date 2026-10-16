# FinGuard: Security & Role-Based Access Control (RBAC)

## 1. Overview

**Status:** IMPLEMENTED AND VERIFIED

FinGuard implements stateless authentication and fine-grained authorization using Spring Security 6, JSON Web Tokens (JJWT), and configurable Cross-Origin Resource Sharing (CORS).

## 2. Authentication & JWT Architecture

- **Token Type:** HMAC-SHA256 signed JSON Web Token (JJWT 0.11.5)
- **Token Claims:** `sub` (username), `roles` (list of assigned authorities), `iat`, `exp`
- **Secret Key:** Externalized via environment variable `JWT_SECRET` (minimum 256 bits). Default fallback configured for local development.
- **Expiration:** Configurable via `JWT_EXPIRATION_MS` (default: 24 hours / 86,400,000 ms).
- **Session Policy:** `SessionCreationPolicy.STATELESS` (no HTTP session cookies).

## 3. Role-Based Access Control Matrix

| Action / Resource | HTTP Method | Endpoint | ANALYST | ADMIN | Anonymous |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **Authenticate** | `POST` | `/api/auth/login` | Allowed | Allowed | Allowed |
| **View Dashboard Summary** | `GET` | `/api/dashboard/summary` | Allowed | Allowed | Allowed (Read-only) |
| **View Risk Distribution** | `GET` | `/api/dashboard/risk-distribution` | Allowed | Allowed | Allowed (Read-only) |
| **View Risk Trend** | `GET` | `/api/dashboard/risk-trend` | Allowed | Allowed | Allowed (Read-only) |
| **Query Priority Alerts** | `GET` | `/api/alerts` | Allowed | Allowed | Allowed (Read-only) |
| **Inspect Customer Profile** | `GET` | `/api/customers/{id}` | Allowed | Allowed | Allowed (Read-only) |
| **View SHAP Explanation** | `GET` | `/api/customers/{id}/explanation` | Allowed | Allowed | Allowed (Read-only) |
| **Update Alert Status** | `PATCH` | `/api/alerts/{id}/status` | Allowed | Allowed | Denied (401/403) |
| **Add Analyst Notes** | `PATCH` | `/api/alerts/{id}/status` | Allowed | Allowed | Denied (401/403) |
| **View Batch Lineage** | `GET` | `/api/batches` | Allowed | Allowed | Allowed (Read-only) |
| **Admin System Operations** | `ALL` | `/api/admin/**` | Denied (403) | Allowed | Denied (401/403) |

## 4. Configurable CORS

Wildcard origin (`*`) has been replaced with strict, environment-configurable origin resolution in `CorsConfig.java`:
- Property: `finguard.cors.allowed-origins`
- Environment Variable: `CORS_ALLOWED_ORIGINS`
- Default Origins: `http://localhost:5173,http://localhost:3000`
- Credentials: `setAllowCredentials(true)`
- Methods: `GET, POST, PUT, DELETE, OPTIONS, PATCH`
- Headers: `Origin, Content-Type, Accept, Authorization, X-Requested-With`

## 5. Secret Management
No production secrets or MongoDB credentials are hardcoded into git-tracked files. All endpoints support override via standard container environment variables (`MONGO_URI`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`).
