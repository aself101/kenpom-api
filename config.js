/**
 * KenPom API Configuration
 *
 * Contains all configuration constants, endpoint URLs, credential loading,
 * and validation helpers for the KenPom.com scraper.
 */

import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Load environment variables from multiple locations (in priority order)
function loadEnvFiles() {
  // 1. Local .env file (highest priority)
  dotenv.config();

  // 2. Global config (~/.kenpom/.env)
  const globalEnvPath = path.join(os.homedir(), '.kenpom', '.env');
  if (fs.existsSync(globalEnvPath)) {
    dotenv.config({ path: globalEnvPath });
  }
}

loadEnvFiles();

// ============================================================================
// BASE CONFIGURATION
// ============================================================================

export const BASE_URL = 'https://kenpom.com';

// ============================================================================
// ENDPOINT DEFINITIONS
// ============================================================================

/**
 * KenPom endpoint URL patterns.
 * Query parameters are added dynamically based on the method.
 */
export const ENDPOINTS = {
  // Authentication
  INDEX: '/index.php',
  LOGIN_HANDLER: '/handlers/login_handler.php',

  // Misc endpoints
  POMEROY_RATINGS: '/index.php',        // ?y={season}
  TRENDS: '/trends.php',
  REFS: '/officials.php',               // ?y={season}
  HCA: '/hca.php',
  ARENAS: '/arenas.php',                // ?y={season}
  GAME_ATTRIBS: '/game_attrs.php',      // ?s={metric}&y={season}
  PROGRAM_RATINGS: '/programs.php',

  // Summary endpoints
  EFFICIENCY: '/summary.php',           // ?y={season}
  FOUR_FACTORS: '/stats.php',           // ?y={season}
  TEAM_STATS: '/teamstats.php',         // ?y={season}&od=d (od=d for defense)
  POINT_DIST: '/pointdist.php',         // ?y={season}
  HEIGHT: '/height.php',                // ?y={season}
  PLAYER_STATS: '/playerstats.php',     // ?s={metric}&y={season}&c={conf}&f={conf}
  KPOY: '/kpoy.php',                    // ?y={season}

  // Team endpoints
  VALID_TEAMS: '/',                     // Parse from homepage, ?y={season}
  TEAM: '/team.php',                    // ?team={team}&y={season}

  // FanMatch
  FANMATCH: '/fanmatch.php',            // ?d={YYYY-MM-DD}

  // Conference endpoints
  CONFERENCE: '/conf.php',              // ?c={conf}&y={season}
  CONFERENCE_STATS: '/confstats.php',   // ?y={season}
};

// ============================================================================
// MINIMUM SEASON REQUIREMENTS
// ============================================================================

/**
 * Minimum season years for each endpoint.
 * Some data is not available before certain years.
 */
export const MIN_SEASONS = {
  POMEROY_RATINGS: 1999,
  EFFICIENCY: 1999,
  FOUR_FACTORS: 1999,
  TEAM_STATS: 1999,
  POINT_DIST: 1999,
  VALID_TEAMS: 1999,
  SCHEDULE: 1999,
  PLAYER_STATS: 2004,
  HEIGHT: 2007,
  ARENAS: 2010,
  GAME_ATTRIBS: 2010,
  KPOY: 2011,
  FANMATCH: 2014,
  REFS: 2016,
};

// ============================================================================
// VALID PARAMETER VALUES
// ============================================================================

/**
 * Valid metrics for player stats endpoint.
 */
export const PLAYER_METRICS = [
  'ORtg', 'Min', 'eFG', 'Poss', 'Shots', 'OR', 'DR', 'TO',
  'ARate', 'Blk', 'FTRate', 'Stl', 'TS', 'FC40', 'FD40',
  '2P', '3P', 'FT'
];

/**
 * Valid metrics for game attributes endpoint.
 */
export const GAME_ATTRIB_METRICS = [
  'Excitement', 'Tension', 'Dominance', 'ComeBack',
  'FanMatch', 'Upsets', 'Busts'
];

/**
 * Valid conference codes.
 */
export const CONFERENCES = [
  'A10', 'ACC', 'AE', 'Amer', 'ASun', 'B10', 'B12', 'BE', 'BSky', 'BSth',
  'BW', 'CAA', 'CUSA', 'Horz', 'Ivy', 'MAAC', 'MAC', 'MEast', 'MVC', 'MWC',
  'NEC', 'OVC', 'Pac', 'Pat', 'SB', 'SC', 'SEC', 'Slnd', 'Sum', 'SWAC',
  'WAC', 'WCC'
];

// ============================================================================
// CREDENTIAL LOADING
// ============================================================================

/**
 * Get KenPom credentials from environment or provided values.
 *
 * Priority:
 * 1. Explicitly provided values
 * 2. Environment variables (KENPOM_EMAIL, KENPOM_PASSWORD)
 *
 * @param {Object} options - Optional credentials
 * @param {string} options.email - KenPom email
 * @param {string} options.password - KenPom password
 * @returns {{ email: string, password: string }} Credentials object
 * @throws {Error} If credentials are not found
 */
export function getKenpomCredentials({ email = null, password = null } = {}) {
  const resolvedEmail = email || process.env.KENPOM_EMAIL;
  const resolvedPassword = password || process.env.KENPOM_PASSWORD;

  if (!resolvedEmail) {
    throw new Error(
      'KenPom email not found. Set KENPOM_EMAIL environment variable ' +
      'or provide email during initialization.'
    );
  }

  if (!resolvedPassword) {
    throw new Error(
      'KenPom password not found. Set KENPOM_PASSWORD environment variable ' +
      'or provide password during initialization.'
    );
  }

  return { email: resolvedEmail, password: resolvedPassword };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate season against minimum year requirement.
 *
 * @param {number|string} season - Season year to validate
 * @param {string} endpoint - Endpoint name for error message
 * @throws {Error} If season is before minimum year
 */
export function validateSeason(season, endpoint) {
  const minYear = MIN_SEASONS[endpoint];
  if (minYear && season && parseInt(season) < minYear) {
    throw new Error(
      `Season ${season} is before minimum year ${minYear} for ${endpoint}`
    );
  }
}

/**
 * Validate player stats metric.
 *
 * @param {string} metric - Metric to validate
 * @throws {Error} If metric is invalid
 */
export function validatePlayerMetric(metric) {
  if (!PLAYER_METRICS.includes(metric)) {
    throw new Error(
      `Invalid metric '${metric}'. Must be one of: ${PLAYER_METRICS.join(', ')}`
    );
  }
}

/**
 * Validate game attribute metric.
 *
 * @param {string} metric - Metric to validate
 * @throws {Error} If metric is invalid
 */
export function validateGameAttribMetric(metric) {
  if (!GAME_ATTRIB_METRICS.includes(metric)) {
    throw new Error(
      `Invalid metric '${metric}'. Must be one of: ${GAME_ATTRIB_METRICS.join(', ')}`
    );
  }
}

/**
 * Validate conference code.
 *
 * @param {string} conf - Conference code to validate
 * @throws {Error} If conference is invalid
 */
export function validateConference(conf) {
  if (conf && !CONFERENCES.includes(conf)) {
    throw new Error(
      `Invalid conference '${conf}'. Must be one of: ${CONFERENCES.join(', ')}`
    );
  }
}

/**
 * Encode team name for URL.
 * Spaces become '+', '&' becomes '%26'.
 *
 * @param {string} team - Team name to encode
 * @returns {string} URL-encoded team name
 */
export function encodeTeamName(team) {
  return team.replace(/ /g, '+').replace(/&/g, '%26');
}

/**
 * Build URL with query parameters.
 *
 * @param {string} endpoint - Endpoint path
 * @param {Object} params - Query parameters
 * @returns {string} Full URL with query string
 */
export function buildUrl(endpoint, params = {}) {
  const url = new URL(endpoint, BASE_URL);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  }

  return url.toString();
}

// ============================================================================
// HTTP CLIENT CONFIGURATION
// ============================================================================

/**
 * Chrome-like headers for requests.
 */
export const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
};
