# Strava MCP Server

A Model Context Protocol (MCP) server for integrating with the Strava API. This server provides comprehensive access to all major Strava API endpoints including activities, athlete data, routes, segments, clubs, and gear.

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

1. Clone this repository or create a new directory:

```bash
mkdir strava-mcp
cd strava-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Run the interactive setup to configure OAuth:

```bash
npm run setup
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
   - **Club**: Optional
   - **Website**: Can use `http://localhost` for testing
   - **Authorization Callback Domain**: Use `localhost` for testing
4. Click "Create"
5. Note your **Client ID** and **Client Secret**

### 2. Run the Setup Script

The easiest way to configure OAuth tokens is to use the interactive setup script:

```bash
npm run setup
```

This script will:
1. Prompt you for your Strava Client ID and Client Secret (or use existing ones from `.env`)
2. Generate an authorization URL for you to visit
3. Guide you through the OAuth flow
4. Exchange the authorization code for access/refresh tokens
5. Automatically save everything to `.env`

**Manual Setup (Alternative)**

If you prefer to set up manually, you can exchange the authorization code yourself:

```bash
curl -X POST https://www.strava.com/oauth/token \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d code=AUTHORIZATION_CODE \
  -d grant_type=authorization_code
```

Then create a `.env` file with all the credentials (see `.env.example`).

## MCP Configuration

### Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

The server automatically loads environment variables from a `.env` file in the project root, so you only need to specify the command:

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

Make sure your `.env` file contains all required variables (see [Strava API Setup](#strava-api-setup) above).


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

## Development

### Scripts

- `npm run build` - Build the TypeScript project
- `npm run dev` - Watch mode for development
- `npm run lint` - Lint the codebase
- `npm test` - Run tests
- `npm start` - Start the MCP server

### Project Structure

```
strava-mcp/
├── src/
│   ├── index.ts              # Main MCP server
│   ├── auth.ts               # OAuth 2.0 authentication
│   ├── strava-client.ts      # Strava API client
│   ├── types/
│   │   └── strava.ts         # TypeScript type definitions
│   └── tools/                # MCP tool implementations
│       ├── activities.ts
│       ├── athlete.ts
│       ├── routes.ts
│       ├── segments.ts
│       ├── clubs.ts
│       └── gear.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Token Refresh

The server automatically refreshes access tokens when they expire. The refresh token is used to obtain a new access token without requiring re-authentication.

## Rate Limiting

Strava has rate limits:
- 100 requests per 15 minutes
- 1,000 requests per day

The server does not currently implement rate limiting, so use responsibly.


## Troubleshooting

### "No tokens available" error
- Ensure all environment variables are set in `.env` or your MCP client config
- Verify tokens haven't expired (check `STRAVA_EXPIRES_AT`)

### "Failed to refresh token" error
- Your refresh token may have been revoked
- Go through the OAuth flow again to get new tokens

### Build errors
- Ensure you're using Node.js 18+ LTS
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript version compatibility

## License

MIT

## Resources

- [Strava API Documentation](https://developers.strava.com/docs/reference/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Strava API Settings](https://www.strava.com/settings/api)
