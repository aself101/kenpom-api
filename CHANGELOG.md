# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-22

### Added

- Initial release of kenpom-api
- **21 Data Endpoints** for KenPom.com college basketball statistics:
  - Pomeroy Ratings (1999+)
  - Efficiency/Tempo stats (1999+)
  - Four Factors (1999+)
  - Team Stats - offense and defense (1999+)
  - Points Distribution (1999+)
  - Height/Experience (2007+)
  - Player Stats with 18 metrics (2004+)
  - KenPom Player of the Year (2011+)
  - Team Schedules (1999+)
  - Scouting Reports with 70+ stats
  - Valid Teams list
  - Arena Statistics (2010+)
  - Game Attributes (2010+)
  - Referee Rankings (2016+)
  - Program Ratings (all-time)
  - Trends
  - Home Court Advantage
  - FanMatch Predictions (2014+)
  - Conference Standings, Offense, Defense, and Stats

- **Tiered HTTP Client** with automatic fallback:
  - Tier 1: cloudscraper for Cloudflare bypass
  - Tier 2: puppeteer-extra with stealth plugin (optional)

- **CLI Tool** (`kenpom` command) with:
  - Individual endpoint flags (--ratings, --efficiency, etc.)
  - Category flags (--all, --all-yearly, --all-single, --all-teams)
  - Year range support (--start, --end)
  - Team and conference filters
  - Player metric selection (--metric, --all-metrics)
  - Dry-run mode for previewing operations
  - Configurable output directory and log level

- **Built-in Rate Limiting** with random delays between requests
- **HTML Table Parsing** with cheerio for reliable data extraction
- **Season Validation** enforcing minimum year requirements per endpoint
- **Comprehensive Documentation** with API reference and examples

### Technical Details

- ES Modules (type: module)
- Node.js 18+ required
- Winston logging with configurable levels
- Environment-based credential management (.env support)
