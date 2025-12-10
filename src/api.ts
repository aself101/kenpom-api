/**
 * KenPom API Wrapper
 *
 * Main API wrapper class for scraping KenPom.com college basketball statistics.
 * Provides methods for fetching ratings, efficiency stats, player stats, and more.
 *
 * Uses a tiered HTTP client approach:
 * - Tier 1: Lightweight HTTP client (handles Cloudflare protection)
 * - Tier 2: Headless browser with stealth (most reliable, heavier)
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
import type {
  KenpomAPIOptions,
  LogLevel,
  ClientTier,
  CloudscraperClient,
  PuppeteerClient,
  PomeroyRating,
  EfficiencyData,
  FourFactorsData,
  TeamStatsData,
  PointDistData,
  HeightData,
  PlayerStats,
  KpoyResult,
  RefData,
  HcaData,
  ArenaData,
  GameAttribData,
  ProgramRatingData,
  TrendsData,
  ScheduleGame,
  FanMatchResponse,
  ScoutingReportStats,
  ConferenceStandingsData,
  ConferenceStatsData,
  ConferenceAggregateData,
  PlayerMetric,
  GameAttribMetric,
} from './types.js';

type ClientType = 'tier1' | 'tier2' | null;
type Client = CloudscraperClient['client'] | { browser: PuppeteerClient['browser']; page: PuppeteerClient['page'] } | null;

/**
 * Wrapper class for KenPom.com statistics scraping.
 *
 * Provides methods to fetch college basketball statistics
 * including ratings, efficiency, player stats, team schedules, and more.
 */
export class KenpomAPI {
  private email: string;
  private password: string;
  private clientTier: ClientTier;
  private client: Client = null;
  private clientType: ClientType = null;
  private isLoggedIn: boolean = false;
  private logger: winston.Logger;
  private _closePuppeteer?: () => Promise<void>;

  /**
   * Initialize KenpomAPI instance.
   *
   * @param options - Configuration options
   * @param options.email - KenPom email. If null, reads from environment.
   * @param options.password - KenPom password. If null, reads from environment.
   * @param options.logLevel - Logging level (DEBUG, INFO, WARNING, ERROR, NONE)
   * @param options.clientTier - Force specific client tier ('tier1', 'tier2', or 'auto')
   */
  constructor(options: KenpomAPIOptions = {}) {
    const { email = null, password = null, logLevel = 'INFO', clientTier = 'auto' } = options;

    // Setup logging
    const level = (typeof logLevel === 'string' ? logLevel : 'INFO').toUpperCase() as LogLevel;
    const isSilent = level === 'NONE';
    this.logger = winston.createLogger({
      level: isSilent ? 'error' : level.toLowerCase(),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level: lvl, message }) => {
          return `${timestamp} - ${(lvl as string).toUpperCase()} - ${message}`;
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

    this.logger.info('KenpomAPI initialized');
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Login to KenPom.com with tiered client approach.
   *
   * Tries clients in order: tier1 (lightweight) → tier2 (headless browser)
   * Stops when login succeeds.
   *
   * @throws Error if all login attempts fail
   */
  async login(): Promise<void> {
    // Map legacy client tier names to new names
    const tierMap: Record<string, string> = {
      'cloudscraper': 'tier1',
      'puppeteer': 'tier2',
      'tier1': 'tier1',
      'tier2': 'tier2',
      'auto': 'auto'
    };
    const normalizedTier = tierMap[this.clientTier] ?? this.clientTier;

    const tiers = normalizedTier === 'auto'
      ? ['tier1', 'tier2']
      : [normalizedTier];

    let lastError: Error | null = null;

    for (const tier of tiers) {
      try {
        const tierLabel = tier === 'tier1' ? 'Tier 1 (lightweight)' : 'Tier 2 (headless browser)';
        this.logger.info(`Attempting login with ${tierLabel}...`);
        await this._loginWithTier(tier);
        this.logger.info(`Successfully logged in with ${tierLabel}`);
        return;
      } catch (error) {
        const tierLabel = tier === 'tier1' ? 'Tier 1' : 'Tier 2';
        this.logger.warn(`Login with ${tierLabel} failed: ${(error as Error).message}`);
        lastError = error as Error;

        // Clean up failed client
        if (this._closePuppeteer) {
          await this._closePuppeteer();
        }
        this.client = null;
      }
    }

    throw new Error(`All login attempts failed. Last error: ${lastError?.message}`);
  }

  /**
   * Login with a specific client tier.
   * @private
   */
  private async _loginWithTier(tier: string): Promise<void> {
    switch (tier) {
      case 'tier1':
        await this._loginWithTier1();
        break;
      case 'tier2':
        await this._loginWithTier2();
        break;
      default:
        throw new Error(`Unknown client tier: '${tier}'. Valid tiers are: 'tier1', 'tier2', or 'auto'.`);
    }
  }

  /**
   * Login using Tier 1 lightweight HTTP client for Cloudflare bypass.
   * @private
   */
  private async _loginWithTier1(): Promise<void> {
    const { client } = await createCloudscraperClient();
    this.clientType = 'tier1';

    // Create HTTP session
    const session = client.create_scraper ? client.create_scraper() : client;
    this.client = session;

    // Step 1: GET initial page
    this.logger.debug('Fetching initial page...');
    await new Promise<string>((resolve, reject) => {
      session.get(`${BASE_URL}/index.php`, (err: Error | null, response: unknown, body: string) => {
        if (err) reject(err);
        else resolve(body);
      });
    });

    // Step 2: POST login credentials
    this.logger.debug('Submitting login form...');
    await new Promise<string>((resolve, reject) => {
      session.post({
        uri: `${BASE_URL}${ENDPOINTS.LOGIN_HANDLER}`,
        formData: {
          email: this.email,
          password: this.password,
          submit: 'Login!',
        },
        followAllRedirects: true,
      }, (err: Error | null, response: unknown, body: string) => {
        if (err) reject(err);
        else resolve(body);
      });
    });

    // Step 3: Verify login
    await this._verifyLogin();
  }

  /**
   * Login using Tier 2 headless browser with stealth.
   * @private
   */
  private async _loginWithTier2(): Promise<void> {
    const { browser, page, close } = await createPuppeteerClient();
    this.client = { browser, page };
    this.clientType = 'tier2';
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
  private async _verifyLogin(): Promise<void> {
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
  private _verifySession(): void {
    if (!this.client || !this.isLoggedIn) {
      throw new Error('Not logged in. Call login() first.');
    }
  }

  /**
   * Get HTML content from a URL.
   * @private
   */
  private async _getHtml(url: string): Promise<string> {
    if (this.clientType === 'tier1') {
      const session = this.client as CloudscraperClient['client'];
      return new Promise((resolve, reject) => {
        session.get(url, (err: Error | null, response: unknown, body: string) => {
          if (err) reject(err);
          else resolve(body);
        });
      });
    }

    if (this.clientType === 'tier2') {
      const { page } = this.client as { page: PuppeteerClient['page'] };
      await page.goto(url, { waitUntil: 'networkidle2' });
      return await page.content();
    }

    throw new Error(`Unknown client type: '${this.clientType}'. This is an internal error - please ensure login() was called successfully before making API requests.`);
  }

  /**
   * Close the client connection.
   */
  async close(): Promise<void> {
    if (this.clientType === 'tier2' && this._closePuppeteer) {
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
   * @param season - Season year (default: current season)
   * @returns Array of team ratings with columns:
   *   Rk, Team, Conf, W-L, AdjEM, AdjO, AdjO.Rank, AdjD, AdjD.Rank,
   *   AdjT, AdjT.Rank, Luck, Luck.Rank, SOS-AdjEM, SOS-AdjEM.Rank,
   *   SOS-OppO, SOS-OppO.Rank, SOS-OppD, SOS-OppD.Rank,
   *   NCSOS-AdjEM, NCSOS-AdjEM.Rank, Seed
   */
  async getPomeroyRatings(season: number | string | null = null): Promise<PomeroyRating[]> {
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
   * @returns Trends data
   */
  async getTrends(): Promise<TrendsData[]> {
    this._verifySession();

    const url = buildUrl(ENDPOINTS.TRENDS);
    this.logger.debug(`Fetching trends: ${url}`);

    const html = await this._getHtml(url);
    return parseTrends(html);
  }

  /**
   * Get referee rankings.
   *
   * @param season - Season year (2016+)
   * @returns Referee stats with columns:
   *   Rank, Name, Rating, Games, Last Game, Game Score
   */
  async getRefs(season: number | string | null = null): Promise<RefData[]> {
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
   * @returns HCA data with columns:
   *   Team, Conference, HCA, HCA.Rank, PF, PF.Rank, Pts, Pts.Rank,
   *   NST, NST.Rank, Blk, Blk.Rank, Elev, Elev.Rank
   */
  async getHca(): Promise<HcaData[]> {
    this._verifySession();

    const url = buildUrl(ENDPOINTS.HCA);
    this.logger.debug(`Fetching HCA: ${url}`);

    const html = await this._getHtml(url);
    return parseHca(html);
  }

  /**
   * Get arena statistics.
   *
   * @param season - Season year (2010+)
   * @returns Arena data with columns:
   *   Rank, Team, Conference, Arena, Arena.Capacity, Alternate, Alternate.Capacity
   */
  async getArenas(season: number | string | null = null): Promise<ArenaData[]> {
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
   * @param season - Season year (2010+)
   * @param metric - Metric: Excitement, Tension, Dominance, ComeBack, FanMatch, Upsets, Busts
   * @returns Game attributes with columns:
   *   Rank, Date, Game, Location, Arena, Conf.Matchup, Value
   */
  async getGameAttribs(
    season: number | string | null = null,
    metric: GameAttribMetric = 'Excitement'
  ): Promise<GameAttribData[]> {
    this._verifySession();
    if (season) validateSeason(season, 'GAME_ATTRIBS');
    validateGameAttribMetric(metric);

    const params: Record<string, string | number> = { s: metric };
    if (season) params['y'] = season;

    const url = buildUrl(ENDPOINTS.GAME_ATTRIBS, params);
    this.logger.debug(`Fetching game attribs: ${url}`);

    const html = await this._getHtml(url);
    return parseGameAttribs(html);
  }

  /**
   * Get all-time program ratings.
   *
   * @returns Program ratings with columns:
   *   Rank, Team, Conference, Rating, kenpom.Best.Rank, kenpom.Best.Season,
   *   kenpom.Worst.Rank, kenpom.Worst.Season, kenpom.Median.Rank,
   *   kenpom.Top10.Finishes, kenpom.Top25.Finishes, kenpom.Top50.Finishes,
   *   NCAA.Champs, NCAA.F4, NCAA.S16, NCAA.R1, Change
   */
  async getProgramRatings(): Promise<ProgramRatingData[]> {
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
   * @param season - Season year (1999+)
   * @returns Efficiency stats (columns vary by year)
   */
  async getEfficiency(season: number | string | null = null): Promise<EfficiencyData[]> {
    this._verifySession();
    if (season) validateSeason(season, 'EFFICIENCY');

    const url = buildUrl(ENDPOINTS.EFFICIENCY, season ? { y: season } : {});
    this.logger.debug(`Fetching efficiency: ${url}`);

    const html = await this._getHtml(url);
    return parseEfficiency(html, season ? parseInt(String(season)) : null);
  }

  /**
   * Get Four Factors statistics.
   *
   * @param season - Season year (1999+)
   * @returns Four factors with 24 columns
   */
  async getFourFactors(season: number | string | null = null): Promise<FourFactorsData[]> {
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
   * @param season - Season year (1999+)
   * @param defense - If true, get defensive stats
   * @returns Team stats with 20 columns
   */
  async getTeamStats(
    season: number | string | null = null,
    defense: boolean = false
  ): Promise<TeamStatsData[]> {
    this._verifySession();
    if (season) validateSeason(season, 'TEAM_STATS');

    const params: Record<string, string | number> = {};
    if (season) params['y'] = season;
    if (defense) params['od'] = 'd';

    const url = buildUrl(ENDPOINTS.TEAM_STATS, params);
    this.logger.debug(`Fetching team stats: ${url}`);

    const html = await this._getHtml(url);
    return parseTeamStats(html, defense);
  }

  /**
   * Get team points distribution.
   *
   * @param season - Season year (1999+)
   * @returns Point distribution with 14 columns
   */
  async getPointDist(season: number | string | null = null): Promise<PointDistData[]> {
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
   * @param season - Season year (2007+)
   * @returns Height/experience data (columns vary by year)
   */
  async getHeight(season: number | string | null = null): Promise<HeightData[]> {
    this._verifySession();
    if (season) validateSeason(season, 'HEIGHT');

    const url = buildUrl(ENDPOINTS.HEIGHT, season ? { y: season } : {});
    this.logger.debug(`Fetching height: ${url}`);

    const html = await this._getHtml(url);
    return parseHeight(html, season ? parseInt(String(season)) : null);
  }

  /**
   * Get player statistics.
   *
   * @param season - Season year (2004+)
   * @param metric - Metric (ORtg, Min, eFG, etc.)
   * @param conf - Conference code (optional)
   * @param confOnly - Only conference games
   * @returns Player stats
   *   (ORtg returns array of 4 tables for different possession thresholds)
   */
  async getPlayerStats(
    season: number | string | null = null,
    metric: PlayerMetric = 'eFG',
    conf: string | null = null,
    confOnly: boolean = false
  ): Promise<PlayerStats[] | PlayerStats[][]> {
    this._verifySession();
    if (season) validateSeason(season, 'PLAYER_STATS');
    validatePlayerMetric(metric);
    if (conf) validateConference(conf);

    const params: Record<string, string | number> = { s: metric };
    if (season) params['y'] = season;
    if (conf) params['c'] = conf;
    if (confOnly && conf) params['f'] = conf;

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
   * @param season - Season year (2004+)
   * @param conf - Conference code (optional)
   * @param confOnly - Only conference games
   * @returns Object with metric names as keys
   */
  async getAllPlayerStats(
    season: number | string | null = null,
    conf: string | null = null,
    confOnly: boolean = false
  ): Promise<Record<string, PlayerStats[] | PlayerStats[][]>> {
    const results: Record<string, PlayerStats[] | PlayerStats[][]> = {};

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
   * @param season - Season year (2011+)
   * @returns KPOY data with parsed player details (Team, Height, Weight, Year, Hometown)
   */
  async getKpoy(season: number | string | null = null): Promise<KpoyResult> {
    this._verifySession();
    if (season) validateSeason(season, 'KPOY');

    const url = buildUrl(ENDPOINTS.KPOY, season ? { y: season } : {});
    this.logger.debug(`Fetching KPOY: ${url}`);

    const html = await this._getHtml(url);
    return parseKpoy(html, season ? parseInt(String(season)) : null);
  }

  // ============================================================================
  // TEAM ENDPOINTS
  // ============================================================================

  /**
   * Get list of valid team names for a season.
   *
   * @param season - Season year (1999+)
   * @returns Array of team names (seeds stripped)
   */
  async getValidTeams(season: number | string | null = null): Promise<string[]> {
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
   * @param team - Team name (required)
   * @param season - Season year (1999+)
   * @returns Team schedule with columns:
   *   Date, Team Rank, Opponent Rank, Opponent Name, Result,
   *   Possession Number, Location, Record, Conference, Tournament
   */
  async getSchedule(team: string, season: number | string | null = null): Promise<ScheduleGame[]> {
    this._verifySession();
    if (!team) throw new Error('Team name is required');
    if (season) validateSeason(season, 'SCHEDULE');

    const encodedTeam = encodeTeamName(team);
    const params: Record<string, string | number> = { team: encodedTeam };
    if (season) params['y'] = season;

    const url = buildUrl(ENDPOINTS.TEAM, params);
    this.logger.debug(`Fetching schedule for ${team}: ${url}`);

    const html = await this._getHtml(url);

    // Schedule is the SECOND table on team page (index 1)
    return parseSchedule(html, season ? parseInt(String(season)) : null);
  }

  // ============================================================================
  // FANMATCH ENDPOINTS
  // ============================================================================

  /**
   * Get FanMatch data for a specific date.
   *
   * @param date - Date in YYYY-MM-DD format (default: today)
   * @returns FanMatch data with:
   *   - date: requested date
   *   - games: array of game objects with parsed predictions
   *   - summary: summary stats (if games completed)
   */
  async getFanMatch(date: string | null = null): Promise<FanMatchResponse> {
    this._verifySession();

    const targetDate = date ?? new Date().toISOString().split('T')[0] ?? '';
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
   * @param team - Team name (required)
   * @param season - Season year (1999+)
   * @param conferenceOnly - If true, get conference-only stats
   * @returns Scouting report with 70+ stats and ranks
   */
  async getScoutingReport(
    team: string,
    season: number | string | null = null,
    conferenceOnly: boolean = false
  ): Promise<ScoutingReportStats> {
    this._verifySession();
    if (!team) throw new Error('Team name is required');
    if (season) validateSeason(season, 'SCHEDULE');

    const encodedTeam = encodeTeamName(team);
    const params: Record<string, string | number> = { team: encodedTeam };
    if (season) params['y'] = season;

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
   * @param conf - Conference code (required)
   * @param season - Season year
   * @returns Conference standings
   */
  async getConferenceStandings(
    conf: string,
    season: number | string | null = null
  ): Promise<ConferenceStandingsData[]> {
    this._verifySession();
    if (!conf) throw new Error('Conference code is required');
    validateConference(conf);

    const params: Record<string, string | number> = { c: conf };
    if (season) params['y'] = season;

    const url = buildUrl(ENDPOINTS.CONFERENCE, params);
    this.logger.debug(`Fetching conference standings for ${conf}: ${url}`);

    const html = await this._getHtml(url);
    return parseConferenceStandings(html);
  }

  /**
   * Get conference offensive stats.
   *
   * @param conf - Conference code (required)
   * @param season - Season year
   * @returns Conference offense stats
   */
  async getConferenceOffense(
    conf: string,
    season: number | string | null = null
  ): Promise<ConferenceStatsData[]> {
    this._verifySession();
    if (!conf) throw new Error('Conference code is required');
    validateConference(conf);

    const params: Record<string, string | number> = { c: conf };
    if (season) params['y'] = season;

    const url = buildUrl(ENDPOINTS.CONFERENCE, params);
    this.logger.debug(`Fetching conference offense for ${conf}: ${url}`);

    const html = await this._getHtml(url);
    return parseConferenceOffense(html);
  }

  /**
   * Get conference defensive stats.
   *
   * @param conf - Conference code (required)
   * @param season - Season year
   * @returns Conference defense stats
   */
  async getConferenceDefense(
    conf: string,
    season: number | string | null = null
  ): Promise<ConferenceStatsData[]> {
    this._verifySession();
    if (!conf) throw new Error('Conference code is required');
    validateConference(conf);

    const params: Record<string, string | number> = { c: conf };
    if (season) params['y'] = season;

    const url = buildUrl(ENDPOINTS.CONFERENCE, params);
    this.logger.debug(`Fetching conference defense for ${conf}: ${url}`);

    const html = await this._getHtml(url);
    return parseConferenceDefense(html);
  }

  /**
   * Get aggregate stats for a conference or all conferences.
   *
   * @param conf - Conference code (optional, omit for all conferences)
   * @param season - Season year
   * @returns Aggregate stats
   */
  async getConferenceStats(
    conf: string | null = null,
    season: number | string | null = null
  ): Promise<(ConferenceAggregateData | ConferenceStatsData)[]> {
    this._verifySession();
    if (conf) validateConference(conf);

    let url: string;
    if (conf) {
      const params: Record<string, string | number> = { c: conf };
      if (season) params['y'] = season;
      url = buildUrl(ENDPOINTS.CONFERENCE, params);
    } else {
      const params: Record<string, string | number> = {};
      if (season) params['y'] = season;
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
   * @returns Current season year
   */
  async getCurrentSeason(): Promise<number> {
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
