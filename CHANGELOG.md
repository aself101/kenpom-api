## [1.0.4](https://github.com/aself101/kenpom-api/compare/v1.0.3...v1.0.4) (2025-12-11)


### Bug Fixes

* **ci:** add build step before tests for TypeScript compilation ([17d5f13](https://github.com/aself101/kenpom-api/commit/17d5f13393452d411164ef0234b37e0868baeed6))

## [1.0.3](https://github.com/aself101/kenpom-api/compare/v1.0.2...v1.0.3) (2025-11-27)


### Bug Fixes

* **ci:** require Node 20.18+ for cheerio/undici compatibility ([9b0ba53](https://github.com/aself101/kenpom-api/commit/9b0ba537485675095ce1201d64d123581a5614e1))

## [1.0.2](https://github.com/aself101/kenpom-api/compare/v1.0.1...v1.0.2) (2025-11-27)


### Bug Fixes

* **docs:** update responsible use disclaimer ([c1370a2](https://github.com/aself101/kenpom-api/commit/c1370a289ec3c99bc161bb7eaf7cd23d7fbf8896))

## [1.0.1](https://github.com/aself101/kenpom-api/compare/v1.0.0...v1.0.1) (2025-11-23)


### Bug Fixes

* **docs:** add responsible use disclaimer to README ([9ba06e3](https://github.com/aself101/kenpom-api/commit/9ba06e314b736fa07e0fd282aa00568fbd16f815))

# 1.0.0 (2025-11-23)


### Features

* initial release of kenpom-api v1.0.0 ([80d1a67](https://github.com/aself101/kenpom-api/commit/80d1a67267f1f1e406bdbc5fdad1a5977cc6ad1a))

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
  - Tier 1: Lightweight HTTP client for Cloudflare bypass
  - Tier 2: Headless browser with stealth plugin (optional)

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
