/**
 * KenPom API Wrapper
 *
 * Main API wrapper class for scraping KenPom.com college basketball statistics.
 * Provides methods for fetching ratings, efficiency stats, player stats, and more.
 *
 * Uses a tiered HTTP client approach:
 * - Tier 1: cloudscraper (handles Cloudflare protection)
 * - Tier 2: puppeteer with stealth (most reliable, heavier)
 *
 * @example
 * const api = new KenpomAPI();
 * await api.login();
 * const ratings = await api.getPomeroyRatings(2025);
 */

import winston from 'winston';
import {
  getKenpomCredentials,
  BASE_URL,
  ENDPOINTS,
  validateSeason,
  validatePlayerMetric,
  validateGameAttribMetric,
  validateConference,
  encodeTeamName,
  buildUrl,
  PLAYER_METRICS,
} from './config.js';
import {
  extractSeason,
  createCloudscraperClient,
  createPuppeteerClient,
  randomPause,
} from './utils.js';
import {
  parsePomeroyRatings,
  parseEfficiency,
  parseFourFactors,
  parseTeamStats,
  parsePointDist,
  parseHeight,
  parsePlayerStats,
  parseAllPlayerStatsTables,
  parseKpoy,
  parseRefs,
  parseHca,
  parseArenas,
  parseGameAttribs,
  parseProgramRatings,
  parseTrends,
  parseSchedule,
  parseFanMatch,
  parseValidTeams,
  parseScoutingReport,
  parseConferenceStandings,
  parseConferenceOffense,
  parseConferenceDefense,
  parseConferenceAggregateStats,
} from './parsers.js';

/**
 * Wrapper class for KenPom.com statistics scraping.
 *
 * Provides methods to fetch college basketball statistics
 * including ratings, efficiency, player stats, team schedules, and more.
 */
export class KenpomAPI {
  /**
   * Initialize KenpomAPI instance.
   *
   * @param {Object} options - Configuration options
   * @param {string} options.email - KenPom email. If null, reads from environment.
   * @param {string} options.password - KenPom password. If null, reads from environment.
   * @param {string} options.logLevel - Logging level (DEBUG, INFO, WARNING, ERROR, NONE)
   * @param {string} options.clientTier - Force specific client tier ('cloudscraper', 'puppeteer', or 'auto')
   */
  constructor({ email = null, password = null, logLevel = 'INFO', clientTier = 'auto' } = {}) {
    // Setup logging
    const isSilent = logLevel.toUpperCase() === 'NONE';
    this.logger = winston.createLogger({
      level: isSilent ? 'error' : logLevel.toLowerCase(),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} - ${level.toUpperCase()} - ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({
          silent: isSilent
        })
      ]
    });

    // Store credentials
    const credentials = getKenpomCredentials({ email, password });
    this.email = credentials.email;
    this.password = credentials.password;

    // Client configuration
    this.clientTier = clientTier;
    this.client = null;
    this.clientType = null;
    this.isLoggedIn = false;

    this.logger.info('KenpomAPI initialized');
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Login to KenPom.com with tiered client approach.
   *
   * Tries clients in order: cloudscraper → puppeteer
   * Stops when login succeeds.
   *
   * @throws {Error} If all login attempts fail
   */
  async login() {
    const tiers = this.clientTier === 'auto'
      ? ['cloudscraper', 'puppeteer']
      : [this.clientTier];

    let lastError = null;

    for (const tier of tiers) {
      try {
        this.logger.info(`Attempting login with ${tier} client...`);
        await this._loginWithTier(tier);
        this.logger.info(`Successfully logged in with ${tier} client`);
        return;
      } catch (error) {
        this.logger.warn(`Login with ${tier} failed: ${error.message}`);
        lastError = error;

        // Clean up failed client
        if (this.client?.close) {
          await this.client.close();
        }
        this.client = null;
      }
    }

    throw new Error(`All login attempts failed. Last error: ${lastError?.message}`);
  }

  /**
   * Login with a specific client tier.
   *
   * @param {string} tier - 'cloudscraper' or 'puppeteer'
   * @private
   */
  async _loginWithTier(tier) {
    switch (tier) {
      case 'cloudscraper':
        await this._loginWithCloudscraper();
        break;
      case 'puppeteer':
        await this._loginWithPuppeteer();
        break;
      default:
        throw new Error(`Unknown client tier: ${tier}`);
    }
  }

  /**
   * Login using cloudscraper for Cloudflare bypass.
   * @private
   */
  async _loginWithCloudscraper() {
    const { client } = await createCloudscraperClient();
    this.clientType = 'cloudscraper';

    // Create cloudscraper session
    const session = client.create_scraper ? client.create_scraper() : client;
    this.client = session;

    // Step 1: GET initial page
    this.logger.debug('Fetching initial page with cloudscraper...');
    await new Promise((resolve, reject) => {
      session.get(`${BASE_URL}/index.php`, (err, response, body) => {
        if (err) reject(err);
        else resolve(body);
      });
    });

    // Step 2: POST login credentials
    this.logger.debug('Submitting login form...');
    await new Promise((resolve, reject) => {
      session.post({
        uri: `${BASE_URL}${ENDPOINTS.LOGIN_HANDLER}`,
        formData: {
          email: this.email,
          password: this.password,
          submit: 'Login!',
        },
        followAllRedirects: true,
      }, (err, response, body) => {
        if (err) reject(err);
        else resolve(body);
      });
    });

    // Step 3: Verify login
    await this._verifyLogin();
  }

  /**
   * Login using puppeteer with stealth (Tier 3).
   * @private
   */
  async _loginWithPuppeteer() {
    const { browser, page, close } = await createPuppeteerClient();
    this.client = { browser, page };
    this.clientType = 'puppeteer';
    this._closePuppeteer = close;

    // Step 1: Navigate to homepage
    this.logger.debug('Navigating to KenPom...');
    await page.goto(`${BASE_URL}/index.php`, { waitUntil: 'networkidle2' });

    // Step 2: Fill login form
    this.logger.debug('Filling login form...');
    await page.type('input[name="email"]', this.email);
    await page.type('input[name="password"]', this.password);

    // Step 3: Submit form
    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    // Step 4: Verify login
    const content = await page.content();
    if (!content.includes('Logged in as')) {
      throw new Error('Login verification failed - "Logged in as" not found');
    }

    this.isLoggedIn = true;
  }

  /**
   * Verify login was successful by checking for "Logged in as" text.
   * @private
   */
  async _verifyLogin() {
    const html = await this._getHtml(BASE_URL);

    if (!html.includes('Logged in as')) {
      throw new Error('Login verification failed - "Logged in as" not found. Check credentials.');
    }

    this.isLoggedIn = true;
  }

  /**
   * Verify session is active.
   * @private
   */
  _verifySession() {
    if (!this.client || !this.isLoggedIn) {
      throw new Error('Not logged in. Call login() first.');
    }
  }

  /**
   * Get HTML content from a URL.
   *
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} HTML content
   * @private
   */
  async _getHtml(url) {
    if (this.clientType === 'cloudscraper') {
      return new Promise((resolve, reject) => {
        this.client.get(url, (err, response, body) => {
          if (err) reject(err);
          else resolve(body);
        });
      });
    }

    if (this.clientType === 'puppeteer') {
      await this.client.page.goto(url, { waitUntil: 'networkidle2' });
      return await this.client.page.content();
    }

    throw new Error(`Unknown client type: ${this.clientType}`);
  }

  /**
   * Close the client connection.
   */
  async close() {
    if (this.clientType === 'puppeteer' && this._closePuppeteer) {
      await this._closePuppeteer();
    }
    this.client = null;
    this.isLoggedIn = false;
    this.logger.info('Client closed');
  }

  // ============================================================================
  // MISC ENDPOINTS
  // ============================================================================

  /**
   * Get Pomeroy college basketball ratings.
   *
   * @param {number|string} season - Season year (default: current season)
   * @returns {Promise<Array<Object>>} Array of team ratings with columns:
   *   Rk, Team, Conf, W-L, AdjEM, AdjO, AdjO.Rank, AdjD, AdjD.Rank,
   *   AdjT, AdjT.Rank, Luck, Luck.Rank, SOS-AdjEM, SOS-AdjEM.Rank,
   *   SOS-OppO, SOS-OppO.Rank, SOS-OppD, SOS-OppD.Rank,
   *   NCSOS-AdjEM, NCSOS-AdjEM.Rank, Seed
   */
  async getPomeroyRatings(season = null) {
    this._verifySession();
    if (season) validateSeason(season, 'POMEROY_RATINGS');

    const url = buildUrl(ENDPOINTS.POMEROY_RATINGS, season ? { y: season } : {});
    this.logger.debug(`Fetching Pomeroy ratings: ${url}`);

    const html = await this._getHtml(url);
    return parsePomeroyRatings(html);
  }

  /**
   * Get statistical trends.
   *
   * @returns {Promise<Array<Object>>} Trends data
   */
  async getTrends() {
    this._verifySession();

    const url = buildUrl(ENDPOINTS.TRENDS);
    this.logger.debug(`Fetching trends: ${url}`);

    const html = await this._getHtml(url);
    return parseTrends(html);
  }

  /**
   * Get referee rankings.
   *
   * @param {number|string} season - Season year (2016+)
   * @returns {Promise<Array<Object>>} Referee stats with columns:
   *   Rank, Name, Rating, Games, Last Game, Game Score
   */
  async getRefs(season = null) {
    this._verifySession();
    if (season) validateSeason(season, 'REFS');

    const url = buildUrl(ENDPOINTS.REFS, season ? { y: season } : {});
    this.logger.debug(`Fetching refs: ${url}`);

    const html = await this._getHtml(url);
    return parseRefs(html);
  }

  /**
   * Get home court advantage statistics.
   *
   * @returns {Promise<Array<Object>>} HCA data with columns:
   *   Team, Conference, HCA, HCA.Rank, PF, PF.Rank, Pts, Pts.Rank,
   *   NST, NST.Rank, Blk, Blk.Rank, Elev, Elev.Rank
   */
  async getHca() {
    this._verifySession();

    const url = buildUrl(ENDPOINTS.HCA);
    this.logger.debug(`Fetching HCA: ${url}`);

    const html = await this._getHtml(url);
    return parseHca(html);
  }

  /**
   * Get arena statistics.
   *
   * @param {number|string} season - Season year (2010+)
   * @returns {Promise<Array<Object>>} Arena data with columns:
   *   Rank, Team, Conference, Arena, Arena.Capacity, Alternate, Alternate.Capacity
   */
  async getArenas(season = null) {
    this._verifySession();
    if (season) validateSeason(season, 'ARENAS');

    const url = buildUrl(ENDPOINTS.ARENAS, season ? { y: season } : {});
    this.logger.debug(`Fetching arenas: ${url}`);

    const html = await this._getHtml(url);
    return parseArenas(html);
  }

  /**
   * Get game attributes/metrics.
   *
   * @param {number|string} season - Season year (2010+)
   * @param {string} metric - Metric: Excitement, Tension, Dominance, ComeBack, FanMatch, Upsets, Busts
   * @returns {Promise<Array<Object>>} Game attributes with columns:
   *   Rank, Date, Game, Location, Arena, Conf.Matchup, Value
   */
  async getGameAttribs(season = null, metric = 'Excitement') {
    this._verifySession();
    if (season) validateSeason(season, 'GAME_ATTRIBS');
    validateGameAttribMetric(metric);

    const params = { s: metric };
    if (season) params.y = season;

    const url = buildUrl(ENDPOINTS.GAME_ATTRIBS, params);
    this.logger.debug(`Fetching game attribs: ${url}`);

    const html = await this._getHtml(url);
    return parseGameAttribs(html);
  }

  /**
   * Get all-time program ratings.
   *
   * @returns {Promise<Array<Object>>} Program ratings with columns:
   *   Rank, Team, Conference, Rating, kenpom.Best.Rank, kenpom.Best.Season,
   *   kenpom.Worst.Rank, kenpom.Worst.Season, kenpom.Median.Rank,
   *   kenpom.Top10.Finishes, kenpom.Top25.Finishes, kenpom.Top50.Finishes,
   *   NCAA.Champs, NCAA.F4, NCAA.S16, NCAA.R1, Change
   */
  async getProgramRatings() {
    this._verifySession();

    const url = buildUrl(ENDPOINTS.PROGRAM_RATINGS);
    this.logger.debug(`Fetching program ratings: ${url}`);

    const html = await this._getHtml(url);
    return parseProgramRatings(html);
  }

  // ============================================================================
  // SUMMARY ENDPOINTS
  // ============================================================================

  /**
   * Get efficiency and tempo statistics.
   *
   * @param {number|string} season - Season year (1999+)
   * @returns {Promise<Array<Object>>} Efficiency stats (columns vary by year)
   */
  async getEfficiency(season = null) {
    this._verifySession();
    if (season) validateSeason(season, 'EFFICIENCY');

    const url = buildUrl(ENDPOINTS.EFFICIENCY, season ? { y: season } : {});
    this.logger.debug(`Fetching efficiency: ${url}`);

    const html = await this._getHtml(url);
    return parseEfficiency(html, season ? parseInt(season) : null);
  }

  /**
   * Get Four Factors statistics.
   *
   * @param {number|string} season - Season year (1999+)
   * @returns {Promise<Array<Object>>} Four factors with 24 columns
   */
  async getFourFactors(season = null) {
    this._verifySession();
    if (season) validateSeason(season, 'FOUR_FACTORS');

    const url = buildUrl(ENDPOINTS.FOUR_FACTORS, season ? { y: season } : {});
    this.logger.debug(`Fetching four factors: ${url}`);

    const html = await this._getHtml(url);
    return parseFourFactors(html);
  }

  /**
   * Get miscellaneous team statistics.
   *
   * @param {number|string} season - Season year (1999+)
   * @param {boolean} defense - If true, get defensive stats
   * @returns {Promise<Array<Object>>} Team stats with 20 columns
   */
  async getTeamStats(season = null, defense = false) {
    this._verifySession();
    if (season) validateSeason(season, 'TEAM_STATS');

    const params = {};
    if (season) params.y = season;
    if (defense) params.od = 'd';

    const url = buildUrl(ENDPOINTS.TEAM_STATS, params);
    this.logger.debug(`Fetching team stats: ${url}`);

    const html = await this._getHtml(url);
    return parseTeamStats(html, defense);
  }

  /**
   * Get team points distribution.
   *
   * @param {number|string} season - Season year (1999+)
   * @returns {Promise<Array<Object>>} Point distribution with 14 columns
   */
  async getPointDist(season = null) {
    this._verifySession();
    if (season) validateSeason(season, 'POINT_DIST');

    const url = buildUrl(ENDPOINTS.POINT_DIST, season ? { y: season } : {});
    this.logger.debug(`Fetching point dist: ${url}`);

    const html = await this._getHtml(url);
    return parsePointDist(html);
  }

  /**
   * Get height and experience statistics.
   *
   * @param {number|string} season - Season year (2007+)
   * @returns {Promise<Array<Object>>} Height/experience data (columns vary by year)
   */
  async getHeight(season = null) {
    this._verifySession();
    if (season) validateSeason(season, 'HEIGHT');

    const url = buildUrl(ENDPOINTS.HEIGHT, season ? { y: season } : {});
    this.logger.debug(`Fetching height: ${url}`);

    const html = await this._getHtml(url);
    return parseHeight(html, season ? parseInt(season) : null);
  }

  /**
   * Get player statistics.
   *
   * @param {number|string} season - Season year (2004+)
   * @param {string} metric - Metric (ORtg, Min, eFG, etc.)
   * @param {string} conf - Conference code (optional)
   * @param {boolean} confOnly - Only conference games
   * @returns {Promise<Array<Object>|Array<Array<Object>>>} Player stats
   *   (ORtg returns array of 4 tables for different possession thresholds)
   */
  async getPlayerStats(season = null, metric = 'eFG', conf = null, confOnly = false) {
    this._verifySession();
    if (season) validateSeason(season, 'PLAYER_STATS');
    validatePlayerMetric(metric);
    if (conf) validateConference(conf);

    const params = { s: metric };
    if (season) params.y = season;
    if (conf) params.c = conf;
    if (confOnly) params.f = conf;

    const url = buildUrl(ENDPOINTS.PLAYER_STATS, params);
    this.logger.debug(`Fetching player stats: ${url}`);

    const html = await this._getHtml(url);

    // ORtg has 4 tables (different possession thresholds)
    if (metric === 'ORtg') {
      return parseAllPlayerStatsTables(html);
    }

    return parsePlayerStats(html, metric);
  }

  /**
   * Get all player stats metrics for a season.
   *
   * @param {number|string} season - Season year (2004+)
   * @param {string} conf - Conference code (optional)
   * @param {boolean} confOnly - Only conference games
   * @returns {Promise<Object>} Object with metric names as keys
   */
  async getAllPlayerStats(season = null, conf = null, confOnly = false) {
    const results = {};

    for (const metric of PLAYER_METRICS) {
      this.logger.info(`Fetching player stats: ${metric}`);
      results[metric] = await this.getPlayerStats(season, metric, conf, confOnly);
      await randomPause(2000, 5000);
    }

    return results;
  }

  /**
   * Get Player of the Year data.
   *
   * @param {number|string} season - Season year (2011+)
   * @returns {Promise<{ kpoy: Array<Object>, mvp: Array<Object>|null }>} KPOY data
   *   with parsed player details (Team, Height, Weight, Year, Hometown)
   */
  async getKpoy(season = null) {
    this._verifySession();
    if (season) validateSeason(season, 'KPOY');

    const url = buildUrl(ENDPOINTS.KPOY, season ? { y: season } : {});
    this.logger.debug(`Fetching KPOY: ${url}`);

    const html = await this._getHtml(url);
    return parseKpoy(html, season ? parseInt(season) : null);
  }

  // ============================================================================
  // TEAM ENDPOINTS
  // ============================================================================

  /**
   * Get list of valid team names for a season.
   *
   * @param {number|string} season - Season year (1999+)
   * @returns {Promise<Array<string>>} Array of team names (seeds stripped)
   */
  async getValidTeams(season = null) {
    this._verifySession();
    if (season) validateSeason(season, 'VALID_TEAMS');

    const url = buildUrl(ENDPOINTS.VALID_TEAMS, season ? { y: season } : {});
    this.logger.debug(`Fetching valid teams: ${url}`);

    const html = await this._getHtml(url);
    return parseValidTeams(html);
  }

  /**
   * Get team schedule.
   *
   * @param {string} team - Team name (required)
   * @param {number|string} season - Season year (1999+)
   * @returns {Promise<Array<Object>>} Team schedule with columns:
   *   Date, Team Rank, Opponent Rank, Opponent Name, Result,
   *   Possession Number, Location, Record, Conference, Tournament
   */
  async getSchedule(team, season = null) {
    this._verifySession();
    if (!team) throw new Error('Team name is required');
    if (season) validateSeason(season, 'SCHEDULE');

    const encodedTeam = encodeTeamName(team);
    const params = { team: encodedTeam };
    if (season) params.y = season;

    const url = buildUrl(ENDPOINTS.TEAM, params);
    this.logger.debug(`Fetching schedule for ${team}: ${url}`);

    const html = await this._getHtml(url);

    // Schedule is the SECOND table on team page (index 1)
    return parseSchedule(html, season ? parseInt(season) : null);
  }

  // ============================================================================
  // FANMATCH ENDPOINTS
  // ============================================================================

  /**
   * Get FanMatch data for a specific date.
   *
   * @param {string} date - Date in YYYY-MM-DD format (default: today)
   * @returns {Promise<Object>} FanMatch data with:
   *   - date: requested date
   *   - games: array of game objects with parsed predictions
   *   - summary: summary stats (if games completed)
   */
  async getFanMatch(date = null) {
    this._verifySession();

    const targetDate = date || new Date().toISOString().split('T')[0];
    const url = buildUrl(ENDPOINTS.FANMATCH, { d: targetDate });
    this.logger.debug(`Fetching FanMatch for ${targetDate}: ${url}`);

    const html = await this._getHtml(url);
    const { games, summary } = parseFanMatch(html);

    return {
      date: targetDate,
      url,
      games,
      summary,
    };
  }

  // ============================================================================
  // SCOUTING REPORT
  // ============================================================================

  /**
   * Get detailed scouting report for a team.
   * Parses stats from inline JavaScript on the team page.
   *
   * @param {string} team - Team name (required)
   * @param {number|string} season - Season year (1999+)
   * @param {boolean} conferenceOnly - If true, get conference-only stats
   * @returns {Promise<Object>} Scouting report with 70+ stats and ranks
   */
  async getScoutingReport(team, season = null, conferenceOnly = false) {
    this._verifySession();
    if (!team) throw new Error('Team name is required');
    if (season) validateSeason(season, 'SCHEDULE');

    const encodedTeam = encodeTeamName(team);
    const params = { team: encodedTeam };
    if (season) params.y = season;

    const url = buildUrl(ENDPOINTS.TEAM, params);
    this.logger.debug(`Fetching scouting report for ${team}: ${url}`);

    const html = await this._getHtml(url);
    return parseScoutingReport(html, conferenceOnly);
  }

  // ============================================================================
  // CONFERENCE ENDPOINTS
  // ============================================================================

  /**
   * Get conference standings.
   *
   * @param {string} conf - Conference code (required)
   * @param {number|string} season - Season year
   * @returns {Promise<Array<Object>>} Conference standings
   */
  async getConferenceStandings(conf, season = null) {
    this._verifySession();
    if (!conf) throw new Error('Conference code is required');
    validateConference(conf);

    const params = { c: conf };
    if (season) params.y = season;

    const url = buildUrl(ENDPOINTS.CONFERENCE, params);
    this.logger.debug(`Fetching conference standings for ${conf}: ${url}`);

    const html = await this._getHtml(url);
    return parseConferenceStandings(html);
  }

  /**
   * Get conference offensive stats.
   *
   * @param {string} conf - Conference code (required)
   * @param {number|string} season - Season year
   * @returns {Promise<Array<Object>>} Conference offense stats
   */
  async getConferenceOffense(conf, season = null) {
    this._verifySession();
    if (!conf) throw new Error('Conference code is required');
    validateConference(conf);

    const params = { c: conf };
    if (season) params.y = season;

    const url = buildUrl(ENDPOINTS.CONFERENCE, params);
    this.logger.debug(`Fetching conference offense for ${conf}: ${url}`);

    const html = await this._getHtml(url);
    return parseConferenceOffense(html);
  }

  /**
   * Get conference defensive stats.
   *
   * @param {string} conf - Conference code (required)
   * @param {number|string} season - Season year
   * @returns {Promise<Array<Object>>} Conference defense stats
   */
  async getConferenceDefense(conf, season = null) {
    this._verifySession();
    if (!conf) throw new Error('Conference code is required');
    validateConference(conf);

    const params = { c: conf };
    if (season) params.y = season;

    const url = buildUrl(ENDPOINTS.CONFERENCE, params);
    this.logger.debug(`Fetching conference defense for ${conf}: ${url}`);

    const html = await this._getHtml(url);
    return parseConferenceDefense(html);
  }

  /**
   * Get aggregate stats for a conference or all conferences.
   *
   * @param {string} conf - Conference code (optional, omit for all conferences)
   * @param {number|string} season - Season year
   * @returns {Promise<Array<Object>>} Aggregate stats
   */
  async getConferenceStats(conf = null, season = null) {
    this._verifySession();
    if (conf) validateConference(conf);

    let url;
    if (conf) {
      const params = { c: conf };
      if (season) params.y = season;
      url = buildUrl(ENDPOINTS.CONFERENCE, params);
    } else {
      const params = season ? { y: season } : {};
      url = buildUrl(ENDPOINTS.CONFERENCE_STATS, params);
    }

    this.logger.debug(`Fetching conference stats: ${url}`);

    const html = await this._getHtml(url);
    return parseConferenceAggregateStats(html, !!conf);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get the current/latest published season.
   *
   * @returns {Promise<number>} Current season year
   */
  async getCurrentSeason() {
    this._verifySession();

    const html = await this._getHtml(BASE_URL);
    const season = extractSeason(html);

    if (!season) {
      throw new Error('Could not determine current season');
    }

    return season;
  }
}

// Default export
export default KenpomAPI;
