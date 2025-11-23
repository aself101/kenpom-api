# KenPom API - Node.js Wrapper

A Node.js wrapper for [KenPom.com](https://kenpom.com/) college basketball statistics with CLI support. Scrapes data from KenPom using authenticated HTTP requests.

## Features

- **21 Data Endpoints** - Ratings, efficiency, four factors, player stats, team schedules, and more
- **Tiered HTTP Client** - Automatic fallback from cloudscraper → puppeteer for Cloudflare handling
- **CLI Tool** - Command-line interface for easy data fetching
- **Rate Limiting** - Built-in delays between requests to respect the site
- **Table Parsing** - Automatic HTML table extraction to JSON objects
- **Season Validation** - Enforces minimum year requirements per endpoint

## Requirements

- Node.js 18+
- Active KenPom.com subscription

## Installation

```bash
# Install globally for CLI usage
npm install -g kenpom-api

# Or install locally in your project
npm install kenpom-api
```

## Authentication Setup

Create a `.env` file with your KenPom credentials:

```bash
KENPOM_EMAIL=your.email@example.com
KENPOM_PASSWORD=your_password
```

Or set environment variables:

```bash
export KENPOM_EMAIL=your.email@example.com
export KENPOM_PASSWORD=your_password
```

## Quick Start

### CLI Usage

```bash
# Fetch ratings for current season
kenpom --ratings

# Fetch ratings for specific year
kenpom --ratings --year 2025

# Fetch multiple endpoints
kenpom --efficiency --four-factors --year 2024

# Fetch all yearly endpoints
kenpom --all-yearly --year 2025

# Fetch player stats with specific metric
kenpom --player-stats --metric ORtg --year 2025

# Fetch all player metrics
kenpom --player-stats --all-metrics --year 2025

# Fetch team schedule
kenpom --schedule --team Duke --year 2025

# Dry run (preview without fetching)
kenpom --all --year 2025 --dry-run

# Show all examples
kenpom --examples
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

// Fetch efficiency stats
const efficiency = await api.getEfficiency(2025);

// Fetch player stats
const playerStats = await api.getPlayerStats(2025, 'eFG');

// Fetch team schedule
const schedule = await api.getSchedule('Duke', 2025);

// Close connection when done
await api.close();
```

## API Reference

### Constructor Options

```javascript
const api = new KenpomAPI({
  email: 'user@example.com',     // KenPom email (default: env KENPOM_EMAIL)
  password: 'password',           // KenPom password (default: env KENPOM_PASSWORD)
  logLevel: 'INFO',              // DEBUG, INFO, WARNING, ERROR, NONE
  clientTier: 'auto',            // cloudscraper, puppeteer, or auto
});
```

### Methods

#### Authentication
- `login()` - Authenticate with KenPom
- `close()` - Close the client connection

#### Misc Endpoints
- `getPomeroyRatings(season)` - Team ratings (1999+)
- `getTrends()` - Statistical trends
- `getRefs(season)` - Referee rankings (2016+)
- `getHca()` - Home court advantage
- `getArenas(season)` - Arena statistics (2010+)
- `getGameAttribs(season, metric)` - Game attributes (2010+)
- `getProgramRatings()` - All-time program ratings

#### Summary Endpoints
- `getEfficiency(season)` - Efficiency/tempo stats (1999+)
- `getFourFactors(season)` - Four Factors (1999+)
- `getTeamStats(season, defense)` - Team statistics (1999+)
- `getPointDist(season)` - Points distribution (1999+)
- `getHeight(season)` - Height/experience (2007+)
- `getPlayerStats(season, metric, conf, confOnly)` - Player leaders (2004+)
- `getAllPlayerStats(season, conf, confOnly)` - All 18 player metrics
- `getKpoy(season)` - Player of the Year (2011+)

#### Team Endpoints
- `getValidTeams(season)` - List of valid team names
- `getSchedule(team, season)` - Team schedule (1999+)
- `getScoutingReport(team, season, conferenceOnly)` - Detailed team scouting report with 70+ stats

#### Conference Endpoints
- `getConferenceStandings(conf, season)` - Conference standings
- `getConferenceOffense(conf, season)` - Conference offensive stats
- `getConferenceDefense(conf, season)` - Conference defensive stats
- `getConferenceStats(conf, season)` - Aggregate stats for one or all conferences

#### FanMatch
- `getFanMatch(date)` - Daily game predictions

#### Utility
- `getCurrentSeason()` - Get current season year

### Valid Metrics

**Player Stats:**
`ORtg`, `Min`, `eFG`, `Poss`, `Shots`, `OR`, `DR`, `TO`, `ARate`, `Blk`, `FTRate`, `Stl`, `TS`, `FC40`, `FD40`, `2P`, `3P`, `FT`

**Game Attributes:**
`Excitement`, `Tension`, `Dominance`, `ComeBack`, `FanMatch`, `Upsets`, `Busts`

### Minimum Season Requirements

| Endpoint | Min Year |
|----------|----------|
| Pomeroy Ratings | 1999 |
| Efficiency | 1999 |
| Four Factors | 1999 |
| Team Stats | 1999 |
| Point Distribution | 1999 |
| Valid Teams | 1999 |
| Schedule | 1999 |
| Player Stats | 2004 |
| Height/Experience | 2007 |
| Arenas | 2010 |
| Game Attributes | 2010 |
| KPOY | 2011 |
| FanMatch | 2014 |
| Refs | 2016 |

## CLI Options

### Category Flags
```bash
--all           # Fetch all endpoints
--all-single    # Fetch all single-fetch endpoints
--all-yearly    # Fetch all yearly endpoints
--all-teams     # Fetch team schedules
```

### Individual Endpoints
```bash
# Single-fetch (no year iteration)
--arenas        --program-ratings   --trends    --hca

# Yearly endpoints
--ratings       --efficiency        --four-factors
--team-stats    --point-dist        --height
--player-stats  --kpoy              --refs
--game-attribs  --valid-teams

# Team/Date based
--schedule      --fanmatch      --fanmatch-date <date>
```

### Parameters
```bash
--year <year>        # Single season year
--start <year>       # Start year for range
--end <year>         # End year for range
--team <name>        # Team name filter
--conference <code>  # Conference filter
--metric <name>      # Metric for player/game stats
--all-metrics        # Fetch all player metrics
--defense            # Fetch defensive stats
```

### Options
```bash
--output-dir <path>  # Output directory (default: datasets)
--log-level <level>  # DEBUG, INFO, WARNING, ERROR
--client <tier>      # cloudscraper, puppeteer, auto
--dry-run            # Preview without fetching
--examples           # Show usage examples
```

## HTTP Client Tiers

The API uses a tiered approach to handle Cloudflare protection:

1. **Tier 1: cloudscraper** - Handles Cloudflare protection with minimal overhead
2. **Tier 2: puppeteer** - Full headless browser (most reliable, heavier dependency)

By default (`--client auto`), the API tries each tier in order until login succeeds.

## Data Output

Data is saved to `datasets/` by default:

```
datasets/
├── single/
│   ├── arenas.json
│   ├── program_ratings.json
│   ├── trends.json
│   └── hca.json
├── ratings/
│   └── ratings_YEAR.json
├── efficiency/
│   └── efficiency_YEAR.json
├── four_factors/
│   └── four_factors_YEAR.json
├── team_stats/
│   └── team_stats_YEAR.json
├── point_dist/
│   └── point_dist_YEAR.json
├── height/
│   └── height_YEAR.json
├── player_stats/
│   └── player_stats_METRIC_YEAR.json
├── kpoy/
│   └── kpoy_YEAR.json
├── refs/
│   └── refs_YEAR.json
├── game_attribs/
│   └── game_attribs_YEAR.json
├── valid_teams/
│   └── valid_teams_YEAR.json
├── schedule/
│   └── YEAR/
│       └── TEAM_schedule_YEAR.json
└── fanmatch/
    └── YEAR/
        └── fanmatch_DATE.json
```

## Development

```bash
# Clone repository
git clone https://github.com/your-username/kenpom-api.git
cd kenpom-api

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run CLI from source
node cli.js --examples
```

## Credits

- Data from [KenPom.com](https://kenpom.com/) (subscription required)
- Inspired by [kenpompy](https://github.com/j-andrews7/kenpompy) Python library

## License

MIT

## Disclaimer

This project is an independent community wrapper and is not affiliated with KenPom.com. Please respect KenPom.com's terms of service and rate limits.
