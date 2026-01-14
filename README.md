# Strava MCP Server

A Model Context Protocol (MCP) server for integrating with the Strava API. This server provides comprehensive access to all major Strava API endpoints including activities, athlete data, routes, segments, clubs, and gear.

## Transport Modes

This server supports two transport modes per the [MCP specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization):

| Mode | Command | Auth | Use Case |
|------|---------|------|----------|
| **stdio** | `npm start` | Environment tokens | Claude Desktop (single user) |
| **HTTP** | `npm run start:http` | OAuth + JWT | ChatGPT, REST clients (multi-user) |

## Features

### Activity Management
- Get athlete activities with filters (date range, pagination)
- Get detailed activity information
- Create, update, and delete activities
- Access activity streams (GPS, heart rate, power, cadence, etc.)
- Get activity comments and kudos

### Athlete Data
- Get authenticated athlete profile
- Get athlete statistics and totals
- Get athlete zones (heart rate and power)

### Routes
- Get athlete routes
- Get detailed route information

### Segments
- Get starred segments
- Get segment details
- Get segment leaderboards with filters
- Explore segments in geographic areas

### Clubs & Social
- Get athlete clubs
- Get club details and members
- Get club activities

### Gear
- Get detailed gear information

## Prerequisites

- Node.js 18+ (LTS recommended)
- A Strava account
- Strava API credentials (Client ID and Client Secret)

## Installation

1. Clone this repository:

```bash
git clone https://github.com/gcoombe/strava-mcp.git
cd strava-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Copy the example environment file:

```bash
cp .env.example .env
```

4. Build the project:

```bash
npm run build
```

## Strava API Setup

### 1. Create a Strava Application

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application
3. Fill in the required information:
   - **Application Name**: Your app name
   - **Category**: Choose appropriate category
   - **Website**: Can use `http://localhost` for testing
   - **Authorization Callback Domain**: Use `localhost` for local testing, or your domain for production
4. Note your **Client ID** and **Client Secret**
5. Add them to your `.env` file

### 2. Choose Your Transport Mode

#### stdio Mode (Claude Desktop)

For single-user use with Claude Desktop:

```bash
# Run the interactive setup to get your personal tokens
npm run setup

# Start the server
npm start
```

The setup script will guide you through the OAuth flow and save tokens to `.env`.

#### HTTP Mode (Multi-user)

For multi-user deployments (ChatGPT, REST clients):

```bash
# Add HTTP-specific variables to .env:
# OAUTH_CLIENT_ID=<generate with: openssl rand -hex 16>
# OAUTH_CLIENT_SECRET=<generate with: openssl rand -hex 16>
# JWT_SECRET=<generate with: openssl rand -base64 32>
# STRAVA_REDIRECT_URI=http://localhost:3000/auth/strava/callback

# Start the HTTP server
npm run start:http
```

Users authenticate via OAuth at `/auth/authorize` and receive a JWT for API access.

### ChatGPT Configuration

To use with ChatGPT:

1. Generate OAuth credentials for your `.env`:
   ```bash
   echo "OAUTH_CLIENT_ID=$(openssl rand -hex 16)"
   echo "OAUTH_CLIENT_SECRET=$(openssl rand -hex 16)"
   ```

2. Expose your server via ngrok or deploy publicly:
   ```bash
   ngrok http 3000
   ```

3. In ChatGPT, configure your MCP server with:
   - **Server URL**: `https://your-ngrok-url.ngrok-free.dev`
   - **OAuth Client ID**: Value from your `.env`
   - **OAuth Client Secret**: Value from your `.env`

ChatGPT will automatically discover the OAuth endpoints via `/.well-known/oauth-authorization-server`.

## MCP Configuration (stdio Mode)

### Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "strava": {
      "command": "node",
      "args": [
        "/absolute/path/to/strava-mcp/dist/index.js"
      ]
    }
  }
}
```

## HTTP API Reference

When running in HTTP mode (`npm run start:http`), the following endpoints are available:

### OAuth 2.0 Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/oauth-authorization-server` | GET | OAuth server metadata (RFC 8414) |
| `/auth/authorize` | GET | OAuth authorization endpoint (redirects to Strava) |
| `/auth/callback` | GET | Internal OAuth callback from Strava |
| `/auth/token` | POST | Exchange authorization code for JWT |
| `/auth/me` | GET | Get current athlete info (requires JWT) |
| `/auth/logout` | POST | Revoke tokens (requires JWT) |

### Tools

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/tools` | GET | - | List all available tools |
| `/tools/:name` | GET | - | Get tool schema |
| `/tools/:name` | POST | JWT | Execute a tool |

### Example Usage

```bash
# Start the server
npm run start:http

# For ChatGPT: Configure with your server URL and OAuth credentials
# ChatGPT will handle the OAuth flow automatically

# For manual testing with curl:
# 1. List tools (no auth required)
curl http://localhost:3000/tools

# 2. After completing OAuth flow, use the JWT for API calls
TOKEN="your-jwt-token"

# Get athlete profile
curl -X POST http://localhost:3000/tools/get_athlete \
  -H "Authorization: Bearer $TOKEN"

# Get recent activities
curl -X POST http://localhost:3000/tools/get_activities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"per_page": 10}'
```

## Available Tools

### Activities
- `get_activities` - List athlete activities with filters
- `get_activity` - Get detailed activity information
- `create_activity` - Create a new manual activity
- `update_activity` - Update an existing activity
- `delete_activity` - Delete an activity
- `get_activity_streams` - Get activity data streams
- `get_activity_comments` - Get activity comments
- `get_activity_kudos` - Get activity kudos

### Athlete
- `get_athlete` - Get authenticated athlete profile
- `get_athlete_stats` - Get athlete statistics
- `get_athlete_zones` - Get athlete training zones

### Routes
- `get_routes` - List athlete routes
- `get_route` - Get route details

### Segments
- `get_starred_segments` - List starred segments
- `get_segment` - Get segment details
- `get_segment_leaderboard` - Get segment leaderboard
- `explore_segments` - Explore segments in an area

### Clubs
- `get_athlete_clubs` - List athlete clubs
- `get_club` - Get club details
- `get_club_members` - Get club members
- `get_club_activities` - Get club activities

### Gear
- `get_gear` - Get gear details

## Environment Variables

| Variable | Required | Mode | Description |
|----------|----------|------|-------------|
| `STRAVA_CLIENT_ID` | Yes | Both | Strava API client ID |
| `STRAVA_CLIENT_SECRET` | Yes | Both | Strava API client secret |
| `STRAVA_ACCESS_TOKEN` | Yes | stdio | User's access token |
| `STRAVA_REFRESH_TOKEN` | Yes | stdio | User's refresh token |
| `STRAVA_EXPIRES_AT` | Yes | stdio | Token expiration timestamp |
| `OAUTH_CLIENT_ID` | Yes | HTTP | OAuth client ID for ChatGPT (you create this) |
| `OAUTH_CLIENT_SECRET` | Yes | HTTP | OAuth client secret for ChatGPT (you create this) |
| `JWT_SECRET` | Yes | HTTP | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | No | HTTP | JWT expiration (default: 7d) |
| `STRAVA_REDIRECT_URI` | Yes | HTTP | OAuth callback URL |
| `DATABASE_PATH` | No | HTTP | SQLite path (default: ./data/strava-mcp.db) |
| `HTTP_PORT` | No | HTTP | Server port (default: 3000) |

## Development

### Scripts

- `npm run build` - Build the TypeScript project
- `npm run dev` - Watch mode for development
- `npm run lint` - Lint the codebase
- `npm test` - Run tests
- `npm start` - Start MCP server (stdio mode)
- `npm run start:http` - Start HTTP server
- `npm run setup` - Interactive OAuth setup

### Project Structure

```
strava-mcp/
├── src/
│   ├── index.ts              # Entry point (mode selection)
│   ├── auth.ts               # Strava OAuth handling
│   ├── strava-client.ts      # Strava API client
│   ├── http-server.ts        # Express HTTP server
│   ├── create-tools.ts       # Tool initialization
│   ├── db.ts                 # SQLite database (HTTP mode)
│   ├── auth/                 # HTTP auth module
│   │   ├── jwt.ts            # JWT utilities
│   │   ├── middleware.ts     # Auth middleware
│   │   └── routes.ts         # OAuth endpoints
│   ├── types/
│   │   └── strava.ts         # TypeScript definitions
│   ├── tools/                # MCP tool implementations
│   │   ├── activities.ts
│   │   ├── athlete.ts
│   │   ├── routes.ts
│   │   ├── segments.ts
│   │   ├── clubs.ts
│   │   └── gear.ts
│   └── utils/
│       └── data-reducer.ts   # Response optimization
├── data/                     # SQLite database (HTTP mode)
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Token Refresh

The server automatically refreshes access tokens when they expire:
- **stdio mode**: Tokens are refreshed in memory
- **HTTP mode**: Refreshed tokens are persisted to SQLite

## Rate Limiting

Strava has rate limits:
- 100 requests per 15 minutes
- 1,000 requests per day

The server does not currently implement rate limiting, so use responsibly.

## Troubleshooting

### "No tokens available" error (stdio mode)
- Ensure all `STRAVA_*` environment variables are set in `.env`
- Run `npm run setup` to obtain new tokens

### "JWT_SECRET required" error (HTTP mode)
- Add `JWT_SECRET` to your `.env` file
- Generate one with: `openssl rand -base64 32`

### "No tokens found for user" error (HTTP mode)
- User needs to re-authenticate at `/auth/strava`
- Tokens may have been revoked by Strava

### "Failed to refresh token" error
- Your refresh token may have been revoked
- Go through the OAuth flow again to get new tokens

### Build errors
- Ensure you're using Node.js 18+ LTS
- Run `npm install` to ensure all dependencies are installed

## License

MIT

## Resources

- [Strava API Documentation](https://developers.strava.com/docs/reference/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP Authorization Spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)
- [Strava API Settings](https://www.strava.com/settings/api)
