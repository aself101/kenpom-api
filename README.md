# KenPom.com College Basketball Statistics API

[![npm version](https://img.shields.io/npm/v/kenpom-api.svg)](https://www.npmjs.com/package/kenpom-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/kenpom-api)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-203%20passing-brightgreen)](test/)
[![Coverage](https://img.shields.io/badge/coverage-82.04%25-brightgreen)](test/)

A Node.js wrapper for [KenPom.com](https://kenpom.com/) college basketball statistics with CLI support. Scrapes data from KenPom using authenticated HTTP requests with automatic Cloudflare bypass.

This service follows the data-collection architecture pattern with organized data storage, rate limiting, comprehensive logging, and CLI orchestration.

## Quick Start

### CLI Usage
```bash
# Install globally
npm install -g kenpom-api

# Configure credentials
export KENPOM_EMAIL="your.email@example.com"
export KENPOM_PASSWORD="your_password"

# Fetch ratings for current season
kenpom --ratings
```

### Programmatic Usage
```javascript
import { KenpomAPI } from 'kenpom-api';

const api = new KenpomAPI();

// Login (required before fetching data)
await api.login();

// Fetch Pomeroy ratings
const ratings = await api.getPomeroyRatings(2025);
console.log('Teams:', ratings.length);

// Close connection when done
await api.close();
```

## Table of Contents

- [Overview](#overview)
- [Data Endpoints](#data-endpoints)
- [Authentication Setup](#authentication-setup)
- [Installation](#installation)
- [CLI Usage](#cli-usage)
- [API Methods](#api-methods)
- [Examples](#examples)
- [Data Organization](#data-organization)
- [HTTP Client Tiers](#http-client-tiers)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)

## Overview

KenPom.com provides the most comprehensive college basketball statistics available. This Node.js service implements:

- **21 Data Endpoints** - Ratings, efficiency stats, four factors, player stats, team schedules, scouting reports, and more
- **Tiered HTTP Client** - Automatic fallback between tiers for reliable Cloudflare handling
- **Built-in Rate Limiting** - Random delays (2-7 seconds) between requests to respect the site
- **HTML Table Parsing** - Automatic extraction using cheerio with proper column mapping
- **Season Validation** - Enforces minimum year requirements per endpoint (e.g., player stats require 2004+)
- **CLI Tool** - Command-line interface with batch processing, year ranges, and dry-run mode
- **Organized Storage** - Structured directories with timestamped files
- **Comprehensive Testing** - 203 tests with 82% coverage (api.js: 93%, config.js: 97%)

## Data Endpoints

### Misc Endpoints
| Endpoint | Min Year | Description |
|----------|----------|-------------|
| Pomeroy Ratings | 1999 | Team rankings with efficiency metrics |
| Trends | - | Statistical trends over time |
| Refs | 2016 | Referee rankings and game scores |
| HCA | - | Home court advantage statistics |
| Arenas | 2010 | Arena capacity and attendance data |
| Game Attributes | 2010 | Excitement, tension, comebacks, upsets |
| Program Ratings | - | All-time program rankings |

### Summary Endpoints
| Endpoint | Min Year | Description |
|----------|----------|-------------|
| Efficiency | 1999 | Adjusted offensive/defensive efficiency |
| Four Factors | 1999 | Shooting, turnovers, rebounding, FT rate |
| Team Stats | 1999 | 20+ team statistics (offense/defense) |
| Point Distribution | 1999 | Scoring distribution patterns |
| Height/Experience | 2007 | Average height and experience metrics |
| Player Stats | 2004 | 18 individual player metrics |
| KPOY | 2011 | Player of the Year rankings |

### Team Endpoints
| Endpoint | Min Year | Description |
|----------|----------|-------------|
| Valid Teams | 1999 | List of team names for a season |
| Schedule | 1999 | Game-by-game results and records |
| Scouting Report | 1999 | 70+ detailed stats and rankings |

### Conference Endpoints
| Endpoint | Description |
|----------|-------------|
| Conference Standings | Conference win/loss records |
| Conference Offense | Offensive stats by conference |
| Conference Defense | Defensive stats by conference |
| Conference Stats | Aggregate stats for all conferences |

### Date-Based Endpoints
| Endpoint | Min Year | Description |
|----------|----------|-------------|
| FanMatch | 2014 | Daily game predictions and results |

## Authentication Setup

### 1. Get Your Subscription

KenPom.com requires a paid subscription to access data:

1. Visit [https://kenpom.com/](https://kenpom.com/)
2. Create an account and subscribe
3. Note your login email and password

### 2. Configure Your Credentials

You can provide your credentials in multiple ways (listed in priority order):

#### Option A: Constructor Parameters (Highest Priority)
Pass credentials directly when initializing:

```javascript
const api = new KenpomAPI({
  email: 'your.email@example.com',
  password: 'your_password'
});
```

This is useful for programmatic usage or testing.

#### Option B: Environment Variables
Set environment variables in your shell:

```bash
# Add to your ~/.bashrc, ~/.zshrc, or equivalent
export KENPOM_EMAIL=your.email@example.com
export KENPOM_PASSWORD=your_password
```

This is ideal for CI/CD pipelines and server environments.

#### Option C: Local .env File (Project-Specific)
Create a `.env` file in your project directory:

```bash
# In your project directory
echo "KENPOM_EMAIL=your.email@example.com" >> .env
echo "KENPOM_PASSWORD=your_password" >> .env
```

This is best for project-specific configurations.

**Security Note:** Never commit `.env` files or expose your credentials publicly. The `.env` file should be added to `.gitignore`.

## Installation

### Option 1: Install from npm

```bash
# Install globally for CLI usage
npm install -g kenpom-api

# Or install locally in your project
npm install kenpom-api
```

### Option 2: Install from source

```bash
# Clone the repository
git clone https://github.com/aself101/kenpom-api.git
cd kenpom-api

# Install dependencies
npm install
```

Dependencies:
- `cheerio` - HTML parsing
- `commander` - CLI argument parsing
- `dotenv` - Environment variable management
- `winston` - Logging framework

Tier 1 (lightweight):
- Handles Cloudflare protection with minimal overhead

Tier 2 (headless browser - optional):
- Full browser automation for complex challenges

## CLI Usage

### Basic Command Structure

```bash
# Global install
kenpom [options]

# Local install (use npx)
npx kenpom [options]

# From source (development)
node cli.js [options]
```

### Category Flags

Fetch groups of endpoints at once:

```bash
--all           # Fetch all endpoints
--all-single    # Fetch all single-fetch endpoints (no year iteration)
--all-yearly    # Fetch all yearly endpoints
--all-teams     # Fetch team schedules for all teams
```

### Individual Endpoint Flags

```bash
# Single-fetch (no year iteration)
--arenas              # Arena data (2010+)
--program-ratings     # All-time program ratings
--trends              # Statistical trends
--hca                 # Home court advantage

# Yearly endpoints
--ratings             # Pomeroy ratings (1999+)
--efficiency          # Efficiency stats (1999+)
--four-factors        # Four factors (1999+)
--team-stats          # Team statistics (1999+)
--point-dist          # Point distribution (1999+)
--height              # Height/experience (2007+)
--player-stats        # Player statistics (2004+)
--kpoy                # Player of the Year (2011+)
--refs                # Referee rankings (2016+)
--game-attribs        # Game attributes (2010+)
--valid-teams         # List of valid team names (1999+)

# Team/Date based
--schedule            # Team schedules (requires --team or fetches all)
--fanmatch            # FanMatch for entire season (2014+)
--fanmatch-date <date>  # FanMatch for single date (YYYY-MM-DD)
```

### Parameters

```bash
--year <year>         # Single season year
--start <year>        # Start year for range
--end <year>          # End year for range
--team <name>         # Team name filter
--conference <code>   # Conference code filter
--metric <name>       # Metric for player/game stats (default: eFG)
--all-metrics         # Fetch all 18 player metrics
--defense             # Fetch defensive stats (for team-stats)
```

### Other Options

```bash
--output-dir <path>   # Output directory (default: datasets)
--log-level <level>   # DEBUG, INFO, WARNING, ERROR
--client <tier>       # tier1, tier2, auto (default: auto)
--dry-run             # Preview what would be fetched
--examples            # Show usage examples
```

### Valid Metrics

**Player Stats (18 metrics):**
`ORtg`, `Min`, `eFG`, `Poss`, `Shots`, `OR`, `DR`, `TO`, `ARate`, `Blk`, `FTRate`, `Stl`, `TS`, `FC40`, `FD40`, `2P`, `3P`, `FT`

**Game Attributes:**
`Excitement`, `Tension`, `Dominance`, `ComeBack`, `FanMatch`, `Upsets`, `Busts`

### Valid Conferences

`A10`, `ACC`, `AE`, `Amer`, `ASun`, `B10`, `B12`, `BE`, `BSky`, `BSth`, `BW`, `CAA`, `CUSA`, `Horz`, `Ivy`, `MAAC`, `MAC`, `MEast`, `MVC`, `MWC`, `NEC`, `OVC`, `Pac`, `Pat`, `SB`, `SC`, `SEC`, `Slnd`, `Sum`, `SWAC`, `WAC`, `WCC`

## API Methods

### Core Methods

#### Constructor

```javascript
const api = new KenpomAPI({
  email: 'user@example.com',      // KenPom email (default: env KENPOM_EMAIL)
  password: 'password',            // KenPom password (default: env KENPOM_PASSWORD)
  logLevel: 'INFO',               // DEBUG, INFO, WARNING, ERROR, NONE
  clientTier: 'auto',             // tier1, tier2, or auto
});
```

#### Authentication

```javascript
// Login to KenPom (required before fetching data)
await api.login();

// Close connection when done
await api.close();
```

### Misc Endpoints

#### `getPomeroyRatings(season)`

Get team ratings with efficiency metrics.

```javascript
const ratings = await api.getPomeroyRatings(2025);
// Returns: Array of 364 teams with 22 columns
// Columns: Rk, Team, Conf, W-L, AdjEM, AdjO, AdjO.Rank, AdjD, AdjD.Rank,
//          AdjT, AdjT.Rank, Luck, Luck.Rank, SOS-AdjEM, SOS-AdjEM.Rank,
//          SOS-OppO, SOS-OppO.Rank, SOS-OppD, SOS-OppD.Rank,
//          NCSOS-AdjEM, NCSOS-AdjEM.Rank, Seed
```

#### `getTrends()`

Get statistical trends over time.

```javascript
const trends = await api.getTrends();
```

#### `getRefs(season)`

Get referee rankings (2016+).

```javascript
const refs = await api.getRefs(2025);
// Returns: Rank, Name, Rating, Games, Last Game, Game Score
```

#### `getHca()`

Get home court advantage statistics.

```javascript
const hca = await api.getHca();
// Returns: Team, Conference, HCA, HCA.Rank, PF, PF.Rank, etc.
```

#### `getArenas(season)`

Get arena statistics (2010+).

```javascript
const arenas = await api.getArenas(2025);
// Returns: Rank, Team, Conference, Arena, Arena.Capacity, Alternate, Alternate.Capacity
```

#### `getGameAttribs(season, metric)`

Get game attributes (2010+).

```javascript
const exciting = await api.getGameAttribs(2025, 'Excitement');
// Returns: Rank, Date, Game, Location, Arena, Conf.Matchup, Value
```

#### `getProgramRatings()`

Get all-time program ratings.

```javascript
const programs = await api.getProgramRatings();
// Returns: Rank, Team, Conference, Rating, Best/Worst seasons, NCAA tournament history
```

### Summary Endpoints

#### `getEfficiency(season)`

Get efficiency and tempo statistics (1999+).

```javascript
const efficiency = await api.getEfficiency(2025);
```

#### `getFourFactors(season)`

Get Four Factors statistics (1999+).

```javascript
const fourFactors = await api.getFourFactors(2025);
// Returns: 24 columns including eFG%, TO%, OR%, FTRate for offense and defense
```

#### `getTeamStats(season, defense)`

Get team statistics (1999+).

```javascript
// Offensive stats
const offense = await api.getTeamStats(2025, false);

// Defensive stats
const defense = await api.getTeamStats(2025, true);
// Returns: 20 columns of detailed team statistics
```

#### `getPointDist(season)`

Get points distribution (1999+).

```javascript
const pointDist = await api.getPointDist(2025);
// Returns: 14 columns showing scoring distribution
```

#### `getHeight(season)`

Get height and experience statistics (2007+).

```javascript
const height = await api.getHeight(2025);
```

#### `getPlayerStats(season, metric, conf, confOnly)`

Get player statistics (2004+).

```javascript
// Single metric
const shooters = await api.getPlayerStats(2025, 'eFG');

// Conference filter
const accPlayers = await api.getPlayerStats(2025, 'eFG', 'ACC');

// Conference games only
const accConfGames = await api.getPlayerStats(2025, 'eFG', 'ACC', true);
```

#### `getAllPlayerStats(season, conf, confOnly)`

Get all 18 player metrics for a season (2004+).

```javascript
const allStats = await api.getAllPlayerStats(2025);
// Returns: Object with metric names as keys
// { ORtg: [...], Min: [...], eFG: [...], ... }
```

#### `getKpoy(season)`

Get Player of the Year rankings (2011+).

```javascript
const kpoy = await api.getKpoy(2025);
// Returns: { kpoy: [...], mvp: [...] }
```

### Team Endpoints

#### `getValidTeams(season)`

Get list of valid team names for a season (1999+).

```javascript
const teams = await api.getValidTeams(2025);
// Returns: Array of team names (e.g., ['Duke', 'North Carolina', ...])
```

#### `getSchedule(team, season)`

Get team schedule (1999+).

```javascript
const schedule = await api.getSchedule('Duke', 2025);
// Returns: Array of games with Date, Opponent, Result, Location, etc.
```

#### `getScoutingReport(team, season, conferenceOnly)`

Get detailed scouting report with 70+ stats (1999+).

```javascript
const report = await api.getScoutingReport('Duke', 2025);
// Returns: Object with detailed offensive/defensive stats and rankings
```

### Conference Endpoints

#### `getConferenceStandings(conf, season)`

Get conference standings.

```javascript
const standings = await api.getConferenceStandings('ACC', 2025);
```

#### `getConferenceOffense(conf, season)`

Get conference offensive stats.

```javascript
const offense = await api.getConferenceOffense('ACC', 2025);
```

#### `getConferenceDefense(conf, season)`

Get conference defensive stats.

```javascript
const defense = await api.getConferenceDefense('ACC', 2025);
```

#### `getConferenceStats(conf, season)`

Get aggregate stats for one or all conferences.

```javascript
// Single conference
const accStats = await api.getConferenceStats('ACC', 2025);

// All conferences
const allConfs = await api.getConferenceStats(null, 2025);
```

### FanMatch Endpoints

#### `getFanMatch(date)`

Get FanMatch predictions and results (2014+).

```javascript
const fanmatch = await api.getFanMatch('2025-03-15');
// Returns: { date, url, games: [...], summary: {...} }
```

### Utility Methods

#### `getCurrentSeason()`

Get the current/latest published season.

```javascript
const season = await api.getCurrentSeason();
// Returns: 2025
```

## Examples

### Example 1: Fetch Current Ratings

```bash
kenpom --ratings
```

```javascript
import { KenpomAPI } from 'kenpom-api';

const api = new KenpomAPI();
await api.login();
const ratings = await api.getPomeroyRatings();
console.log(`Top team: ${ratings[0].Team} (${ratings[0].AdjEM})`);
await api.close();
```

### Example 2: Historical Data Collection

```bash
# Fetch all yearly endpoints for 2020-2025
kenpom --all-yearly --start 2020 --end 2025
```

### Example 3: Player Stats Analysis

```bash
# Fetch all player metrics for a season
kenpom --player-stats --all-metrics --year 2025

# Fetch specific metric for a conference
kenpom --player-stats --metric eFG --conference ACC --year 2025
```

```javascript
const api = new KenpomAPI();
await api.login();

// Get all player stats
const allStats = await api.getAllPlayerStats(2025);

// Find top shooters
const topShooters = allStats.eFG.slice(0, 10);
console.log('Top 10 eFG%:', topShooters.map(p => `${p.Player}: ${p.eFG}`));

await api.close();
```

### Example 4: Team Schedule and Scouting

```bash
# Get Duke's schedule
kenpom --schedule --team Duke --year 2025

# Get all team schedules (takes a while)
kenpom --schedule --year 2025
```

```javascript
const api = new KenpomAPI();
await api.login();

// Get schedule
const schedule = await api.getSchedule('Duke', 2025);
console.log(`Duke: ${schedule.length} games`);

// Get detailed scouting report
const report = await api.getScoutingReport('Duke', 2025);
console.log(`AdjO: ${report.AdjO}, AdjD: ${report.AdjD}`);

await api.close();
```

### Example 5: FanMatch Predictions

```bash
# Single date
kenpom --fanmatch-date 2025-03-15

# Entire season
kenpom --fanmatch --year 2025
```

```javascript
const api = new KenpomAPI();
await api.login();

const fanmatch = await api.getFanMatch('2025-03-15');
console.log(`${fanmatch.games.length} games on ${fanmatch.date}`);

for (const game of fanmatch.games) {
  console.log(`${game.Team1} vs ${game.Team2}: Predicted ${game.PredictedWinner}`);
}

await api.close();
```

### Example 6: Dry Run Preview

```bash
# Preview without fetching
kenpom --all --year 2025 --dry-run
```

Output:
```
================================================================================
KenPom Data Fetcher
================================================================================
Mode: single year: 2025
Years to process: 1
Output directory: datasets
DRY RUN: No data will be fetched
================================================================================

Selected endpoints:
  ✓ Arenas (2010+)
  ✓ Program Ratings
  ✓ Trends
  ✓ Home Court Advantage
  ✓ Pomeroy Ratings (1999+)
  ...
```

## Data Organization

Data is saved to `datasets/` by default, organized by endpoint type:

```
datasets/
├── arenas/
│   └── arenas.json
├── program_ratings/
│   └── program_ratings.json
├── trends/
│   └── trends.json
├── hca/
│   └── hca.json
├── ratings/
│   └── ratings_2025.json
├── efficiency/
│   └── efficiency_2025.json
├── four_factors/
│   └── four_factors_2025.json
├── team_stats/
│   ├── team_stats_2025.json
│   └── team_stats_defense_2025.json
├── point_dist/
│   └── point_dist_2025.json
├── height/
│   └── height_2025.json
├── player_stats/
│   ├── player_stats_eFG_2025.json
│   └── player_stats_2025.json         # All metrics
├── kpoy/
│   └── kpoy_2025.json
├── refs/
│   └── refs_2025.json
├── game_attribs/
│   └── game_attribs_2025.json
├── valid_teams/
│   └── valid_teams_2025.json
├── schedule/
│   └── 2025/
│       ├── Duke_schedule_2025.json
│       └── North Carolina_schedule_2025.json
└── fanmatch/
    └── 2025/
        ├── fanmatch_2025-03-15.json
        └── fanmatch_2025-03-16.json
```

**Data Format:**

All data is saved as JSON arrays or objects:

```json
[
  {
    "Rk": 1,
    "Team": "Houston",
    "Conf": "B12",
    "W-L": "32-4",
    "AdjEM": 30.52,
    "AdjO": 119.2,
    "AdjO.Rank": 14,
    "AdjD": 88.7,
    "AdjD.Rank": 1
  }
]
```

## HTTP Client Tiers

The API uses a tiered approach to handle Cloudflare protection:

### Tier 1: Lightweight HTTP Client (Default)

- Handles most Cloudflare challenges automatically
- No browser overhead, fast performance
- Used by default

### Tier 2: Headless Browser with Stealth

- Full browser automation
- Most reliable for complex challenges
- Falls back automatically if Tier 1 fails

### Configuration

```bash
# Auto mode (default) - tries Tier 1 first, then Tier 2
kenpom --ratings --client auto

# Force specific tier
kenpom --ratings --client tier1
kenpom --ratings --client tier2
```

```javascript
// Auto mode (default)
const api = new KenpomAPI({ clientTier: 'auto' });

// Force specific tier
const api = new KenpomAPI({ clientTier: 'tier2' });
```

## Error Handling

### Rate Limiting

The service includes built-in rate limiting with random delays (2-7 seconds) between requests. This helps avoid being blocked by KenPom.

### Session Management

```javascript
const api = new KenpomAPI();

try {
  await api.login();
  // ... fetch data
} catch (error) {
  if (error.message.includes('Login verification failed')) {
    console.error('Check your credentials');
  }
} finally {
  await api.close();  // Always close the connection
}
```

### Season Validation

The API validates season parameters and throws clear errors:

```javascript
// This will throw an error - player stats only available from 2004
await api.getPlayerStats(2003, 'eFG');
// Error: Season 2003 is not available for PLAYER_STATS. Minimum year: 2004
```

## Troubleshooting

### Credentials Not Found

```
Error: KenPom credentials not found
```

**Solution:** Create `.env` file with your credentials:
```bash
KENPOM_EMAIL=your.email@example.com
KENPOM_PASSWORD=your_password
```

### Login Failed

```
Error: Login verification failed - "Logged in as" not found
```

**Solution:**
1. Verify your credentials are correct
2. Check your KenPom subscription is active
3. Try using Tier 2 client: `--client tier2`

### Cloudflare Block

```
Error: All login attempts failed
```

**Solution:**
1. Wait a few minutes and try again
2. Use Tier 2 client: `--client tier2`
3. Check if KenPom is experiencing issues

### Missing Dependencies

```
Error: Cannot find module
```

**Solution:** Install dependencies:
```bash
cd kenpom-api
npm install
```

### Tier 2 Not Available

```
Warning: Tier 2 client not available
```

**Solution:** Install optional dependencies for headless browser support:
```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

## Development

### Running from Source

```bash
# Clone repository
git clone https://github.com/aself101/kenpom-api.git
cd kenpom-api

# Install dependencies
npm install

# Run CLI from source
node cli.js --examples
node cli.js --ratings --year 2025 --dry-run
```

### Testing

```bash
npm test                  # Run all 203 tests with Vitest
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate coverage report (82% overall)
```

**Test Coverage:**
- Overall: 82.04% lines, 69.37% branches
- api.js: 93.02% lines (authentication, all endpoints)
- config.js: 97.05% lines (validation, configuration)
- parsers.js: 86% lines (HTML parsing)
- utils.js: 72.05% lines (file I/O, HTTP clients)

### npm Scripts

```bash
npm run kenpom             # Run CLI
npm run kenpom:help        # Show help
npm run kenpom:ratings     # Fetch ratings
npm run kenpom:efficiency  # Fetch efficiency stats
```

Pass additional flags with `--`:
```bash
npm run kenpom -- --ratings --year 2025 --dry-run
```

## Rate Limits

KenPom does not publish official rate limits, but the service includes:

- Random delays (2-7 seconds) between requests
- Automatic retry with backoff on errors
- Dry-run mode to preview operations before fetching

**Recommendation:** When fetching large amounts of data (e.g., all team schedules), consider running during off-peak hours and using longer delays.

## Additional Resources

- [KenPom.com](https://kenpom.com/) - Official site (subscription required)
- [kenpompy](https://github.com/j-andrews7/kenpompy) - Python library (inspiration for this project)

## Related Packages

This package is part of the data-collection ecosystem. Check out these other sports data services:

- [`cbb-data-api`](https://github.com/aself101/cbb-data-api) - College Basketball Data REST API wrapper
- [`odds-api`](https://github.com/aself101/odds-api) - Sports betting odds API wrapper

---

**Disclaimer:** This project is an independent community wrapper and is not affiliated with KenPom.com. Please respect KenPom.com's terms of service and rate limits. A valid KenPom subscription is required.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note:** This service implements web scraping for data collection. Fine-tuning and custom parsing can be added as needed following the same patterns established in the parsers module.
