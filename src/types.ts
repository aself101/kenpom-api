/**
 * KenPom API Type Definitions
 *
 * Comprehensive type definitions for the KenPom.com statistics API wrapper.
 */

// Puppeteer types - using minimal interfaces to avoid optional dependency issues
interface Browser {
  close(): Promise<void>;
}

interface Page {
  goto(url: string, options?: { waitUntil?: string }): Promise<unknown>;
  content(): Promise<string>;
  type(selector: string, text: string): Promise<void>;
  click(selector: string): Promise<void>;
  waitForNavigation(options?: { waitUntil?: string }): Promise<unknown>;
  setUserAgent(userAgent: string): Promise<void>;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/** Logging levels supported by the API */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'NONE';

/** HTTP client tiers for handling Cloudflare protection */
export type ClientTier = 'tier1' | 'tier2' | 'auto' | 'cloudscraper' | 'puppeteer';

/** Valid player statistics metrics */
export const PLAYER_METRICS = [
  'ORtg', 'Min', 'eFG', 'Poss', 'Shots', 'OR', 'DR', 'TO',
  'ARate', 'Blk', 'FTRate', 'Stl', 'TS', 'FC40', 'FD40',
  '2P', '3P', 'FT'
] as const;

export type PlayerMetric = typeof PLAYER_METRICS[number];

/** Valid game attribute metrics */
export const GAME_ATTRIB_METRICS = [
  'Excitement', 'Tension', 'Dominance', 'ComeBack',
  'FanMatch', 'Upsets', 'Busts'
] as const;

export type GameAttribMetric = typeof GAME_ATTRIB_METRICS[number];

/** Valid conference codes */
export const CONFERENCES = [
  'A10', 'ACC', 'AE', 'Amer', 'ASun', 'B10', 'B12', 'BE', 'BSky', 'BSth',
  'BW', 'CAA', 'CUSA', 'Horz', 'Ivy', 'MAAC', 'MAC', 'MEast', 'MVC', 'MWC',
  'NEC', 'OVC', 'Pac', 'Pat', 'SB', 'SC', 'SEC', 'Slnd', 'Sum', 'SWAC',
  'WAC', 'WCC'
] as const;

export type Conference = typeof CONFERENCES[number];

/** Minimum season years for each endpoint */
export interface MinSeasons {
  POMEROY_RATINGS: number;
  EFFICIENCY: number;
  FOUR_FACTORS: number;
  TEAM_STATS: number;
  POINT_DIST: number;
  VALID_TEAMS: number;
  SCHEDULE: number;
  PLAYER_STATS: number;
  HEIGHT: number;
  ARENAS: number;
  GAME_ATTRIBS: number;
  KPOY: number;
  FANMATCH: number;
  REFS: number;
}

/** Endpoint key for minimum season validation */
export type EndpointKey = keyof MinSeasons;

// ============================================================================
// API OPTIONS
// ============================================================================

/** Configuration options for KenpomAPI constructor */
export interface KenpomAPIOptions {
  email?: string | null;
  password?: string | null;
  logLevel?: LogLevel | string;
  clientTier?: ClientTier;
}

/** KenPom credentials */
export interface KenpomCredentials {
  email: string;
  password: string;
}

/** Options for getKenpomCredentials function */
export interface CredentialOptions {
  email?: string | null;
  password?: string | null;
}

// ============================================================================
// HTTP CLIENT TYPES
// ============================================================================

/** Cloudscraper client interface */
export interface CloudscraperClient {
  type: 'cloudscraper';
  client: CloudscraperInstance;
}

/** Cloudscraper instance interface (runtime type from cloudscraper) */
export interface CloudscraperInstance {
  get: (
    url: string,
    callback: (err: Error | null, response: unknown, body: string) => void
  ) => void;
  post: (
    options: {
      uri: string;
      formData: Record<string, string>;
      followAllRedirects?: boolean;
    },
    callback: (err: Error | null, response: unknown, body: string) => void
  ) => void;
  create_scraper?: () => CloudscraperInstance;
}

/** Puppeteer client interface */
export interface PuppeteerClient {
  type: 'puppeteer';
  browser: Browser;
  page: Page;
  close: () => Promise<void>;
}

/** Union type for HTTP clients */
export type HttpClient = CloudscraperClient | PuppeteerClient;

// ============================================================================
// DATA TYPES - RATINGS & EFFICIENCY
// ============================================================================

/** Pomeroy Ratings row */
export interface PomeroyRating {
  Rk: string;
  Team: string;
  Conf: string;
  'W-L': string;
  AdjEM: string;
  AdjO: string;
  'AdjO.Rank': string;
  AdjD: string;
  'AdjD.Rank': string;
  AdjT: string;
  'AdjT.Rank': string;
  Luck: string;
  'Luck.Rank': string;
  'SOS-AdjEM': string;
  'SOS-AdjEM.Rank': string;
  'SOS-OppO': string;
  'SOS-OppO.Rank': string;
  'SOS-OppD': string;
  'SOS-OppD.Rank': string;
  'NCSOS-AdjEM': string;
  'NCSOS-AdjEM.Rank': string;
  Seed: string;
}

/** Efficiency data row (structure varies by year) */
export interface EfficiencyData {
  Team: string;
  Conference: string;
  'Tempo-Adj': string;
  'Tempo-Adj.Rank': string;
  'Tempo-Raw': string;
  'Tempo-Raw.Rank': string;
  // 2010+ only
  'Avg.Poss.Length-Off'?: string;
  'Avg.Poss.Length-Off.Rank'?: string;
  'Avg.Poss.Length-Def'?: string;
  'Avg.Poss.Length-Def.Rank'?: string;
  'Off.Efficiency-Adj': string;
  'Off.Efficiency-Adj.Rank': string;
  'Off.Efficiency-Raw': string;
  'Off.Efficiency-Raw.Rank': string;
  'Def.Efficiency-Adj': string;
  'Def.Efficiency-Adj.Rank': string;
  'Def.Efficiency-Raw': string;
  'Def.Efficiency-Raw.Rank': string;
}

/** Four Factors data row */
export interface FourFactorsData {
  Team: string;
  Conference: string;
  AdjTempo: string;
  'AdjTempo.Rank': string;
  AdjOE: string;
  'AdjOE.Rank': string;
  'Off-eFG%': string;
  'Off-eFG%.Rank': string;
  'Off-TO%': string;
  'Off-TO%.Rank': string;
  'Off-OR%': string;
  'Off-OR%.Rank': string;
  'Off-FTRate': string;
  'Off-FTRate.Rank': string;
  AdjDE: string;
  'AdjDE.Rank': string;
  'Def-eFG%': string;
  'Def-eFG%.Rank': string;
  'Def-TO%': string;
  'Def-TO%.Rank': string;
  'Def-OR%': string;
  'Def-OR%.Rank': string;
  'Def-FTRate': string;
  'Def-FTRate.Rank': string;
}

// ============================================================================
// DATA TYPES - TEAM STATS
// ============================================================================

/** Team Stats data row */
export interface TeamStatsData {
  Team: string;
  Conference: string;
  '3P%': string;
  '3P%.Rank': string;
  '2P%': string;
  '2P%.Rank': string;
  'FT%': string;
  'FT%.Rank': string;
  'Blk%': string;
  'Blk%.Rank': string;
  'Stl%': string;
  'Stl%.Rank': string;
  'NST%': string;
  'NST%.Rank': string;
  'A%': string;
  'A%.Rank': string;
  '3PA%': string;
  '3PA%.Rank': string;
  AdjOE?: string;
  'AdjOE.Rank'?: string;
  AdjDE?: string;
  'AdjDE.Rank'?: string;
}

/** Point Distribution data row */
export interface PointDistData {
  Team: string;
  Conference: string;
  'Off-FT': string;
  'Off-FT.Rank': string;
  'Off-2P': string;
  'Off-2P.Rank': string;
  'Off-3P': string;
  'Off-3P.Rank': string;
  'Def-FT': string;
  'Def-FT.Rank': string;
  'Def-2P': string;
  'Def-2P.Rank': string;
  'Def-3P': string;
  'Def-3P.Rank': string;
}

/** Height/Experience data row (structure varies by year) */
export interface HeightData {
  Team: string;
  Conference: string;
  AvgHgt: string;
  'AvgHgt.Rank': string;
  EffHgt: string;
  'EffHgt.Rank': string;
  'C-Hgt': string;
  'C-Hgt.Rank': string;
  'PF-Hgt': string;
  'PF-Hgt.Rank': string;
  'SF-Hgt': string;
  'SF-Hgt.Rank': string;
  'SG-Hgt': string;
  'SG-Hgt.Rank': string;
  'PG-Hgt': string;
  'PG-Hgt.Rank': string;
  Experience: string;
  'Experience.Rank': string;
  Bench: string;
  'Bench.Rank': string;
  // 2008+ only
  Continuity?: string;
  'Continuity.Rank'?: string;
}

// ============================================================================
// DATA TYPES - PLAYER STATS
// ============================================================================

/** Base player stats row */
export interface PlayerStatsBase {
  Rank: string;
  Player: string;
  Team: string;
  Ht: string;
  Wt: string;
  Yr: string;
}

/** Player stats with ORtg metric */
export interface PlayerStatsORtg extends PlayerStatsBase {
  ORtg: string;
  'Poss%': string;
}

/** Player stats with shooting metrics */
export interface PlayerStatsFG extends PlayerStatsBase {
  [key: string]: string;
}

/** Player stats with any metric */
export type PlayerStats = PlayerStatsBase & Record<string, string>;

/** KPOY (Player of the Year) data row */
export interface KpoyPlayer {
  Rank: string;
  Player: string;
  Team: string;
  Height: string;
  Weight: string;
  Year: string;
  Hometown: string;
  'KPOY Rating': string;
}

/** KPOY result */
export interface KpoyResult {
  kpoy: KpoyPlayer[];
  mvp: KpoyPlayer[] | null;
}

// ============================================================================
// DATA TYPES - MISC ENDPOINTS
// ============================================================================

/** Referee ranking data row */
export interface RefData {
  Rank: string;
  Name: string;
  Rating: string;
  Games: string;
  'Last Game': string;
  'Game Score': string;
}

/** Home Court Advantage data row */
export interface HcaData {
  Team: string;
  Conference: string;
  HCA: string;
  'HCA.Rank': string;
  PF: string;
  'PF.Rank': string;
  Pts: string;
  'Pts.Rank': string;
  NST: string;
  'NST.Rank': string;
  Blk: string;
  'Blk.Rank': string;
  Elev: string;
  'Elev.Rank': string;
}

/** Arena data row */
export interface ArenaData {
  Rank: string;
  Team: string;
  Conference: string;
  Arena: string;
  'Arena.Capacity': string;
  Alternate: string;
  'Alternate.Capacity': string;
}

/** Game Attributes data row */
export interface GameAttribData {
  Rank: string;
  Date: string;
  Game: string;
  Location: string;
  Arena: string;
  'Conf.Matchup': string;
  Value: string;
}

/** Program Ratings data row */
export interface ProgramRatingData {
  Rank: string;
  Team: string;
  Conference: string;
  Rating: string;
  'kenpom.Best.Rank': string;
  'kenpom.Best.Season': string;
  'kenpom.Worst.Rank': string;
  'kenpom.Worst.Season': string;
  'kenpom.Median.Rank': string;
  'kenpom.Top10.Finishes': string;
  'kenpom.Top25.Finishes': string;
  'kenpom.Top50.Finishes': string;
  'NCAA.Champs': string;
  'NCAA.F4': string;
  'NCAA.S16': string;
  'NCAA.R1': string;
  Change: string;
}

/** Trends data row (dynamic columns) */
export type TrendsData = Record<string, string>;

// ============================================================================
// DATA TYPES - TEAM SCHEDULE
// ============================================================================

/** Team schedule data row */
export interface ScheduleGame {
  Date: string;
  'Team Rank': string;
  'Opponent Rank': string;
  'Opponent Name': string;
  Result: string;
  'Possession Number': string;
  Location: string;
  Record: string;
  Conference: string;
  Tournament: string;
}

// ============================================================================
// DATA TYPES - FANMATCH
// ============================================================================

/** FanMatch game data */
export interface FanMatchGame {
  Game: string;
  MVP: string | null;
  Tournament: string | null;
  Possessions: string | null;
  'Thrill Score': string;
  'Come back': string;
  'Excite ment': string;
  PredictedWinner: string | null;
  PredictedScore: string | null;
  WinProbability: string | null;
  PredictedPossessions: number | null;
  PredictedMOV: number | null;
  Winner: string | null;
  WinnerRank: string | null;
  WinnerScore: string | null;
  Loser: string | null;
  LoserRank: string | null;
  LoserScore: string | null;
  OT: string | null;
  ActualMOV: number | null;
  PredictedLoser: string | null;
}

/** FanMatch summary stats */
export interface FanMatchSummary {
  linesOfNight: string[];
  ppg: number | null;
  avgEff: number | null;
  pos40: number | null;
  meanAbsErrPredTotalScore: number | null;
  biasPredTotalScore: number | null;
  meanAbsErrPredMov: number | null;
  recordFavs: string | null;
  expectedRecordFavs: string | null;
  exactMov: number | null;
}

/** FanMatch result */
export interface FanMatchResult {
  games: FanMatchGame[];
  summary: FanMatchSummary | null;
}

/** FanMatch API response (with metadata) */
export interface FanMatchResponse {
  date: string;
  url: string;
  games: FanMatchGame[];
  summary: FanMatchSummary | null;
}

/** Game result from parseGameResult */
export interface GameResult {
  Winner: string | null;
  WinnerRank: string | null;
  WinnerScore: string | null;
  Loser: string | null;
  LoserRank: string | null;
  LoserScore: string | null;
  OT: string | null;
  ActualMOV: number | null;
  isCompleted: boolean;
  isNeutral: boolean;
  isAway: boolean;
}

// ============================================================================
// DATA TYPES - SCOUTING REPORT
// ============================================================================

/** Scouting report stats */
export interface ScoutingReportStats {
  OE: string;
  'OE.Rank': string;
  DE: string;
  'DE.Rank': string;
  Tempo: string;
  'Tempo.Rank': string;
  APLO: string;
  'APLO.Rank': string;
  APLD: string;
  'APLD.Rank': string;
  eFG: string;
  'eFG.Rank': string;
  DeFG: string;
  'DeFG.Rank': string;
  TOPct: string;
  'TOPct.Rank': string;
  DTOPct: string;
  'DTOPct.Rank': string;
  ORPct: string;
  'ORPct.Rank': string;
  DORPct: string;
  'DORPct.Rank': string;
  FTR: string;
  'FTR.Rank': string;
  DFTR: string;
  'DFTR.Rank': string;
  '3Pct': string;
  '3Pct.Rank': string;
  D3Pct: string;
  'D3Pct.Rank': string;
  '2Pct': string;
  '2Pct.Rank': string;
  D2Pct: string;
  'D2Pct.Rank': string;
  FTPct: string;
  'FTPct.Rank': string;
  DFTPct: string;
  'DFTPct.Rank': string;
  BlockPct: string;
  'BlockPct.Rank': string;
  DBlockPct: string;
  'DBlockPct.Rank': string;
  StlRate: string;
  'StlRate.Rank': string;
  DStlRate: string;
  'DStlRate.Rank': string;
  NSTRate: string;
  'NSTRate.Rank': string;
  DNSTRate: string;
  'DNSTRate.Rank': string;
  '3PARate': string;
  '3PARate.Rank': string;
  D3PARate: string;
  'D3PARate.Rank': string;
  ARate: string;
  'ARate.Rank': string;
  DARate: string;
  'DARate.Rank': string;
  PD3: string;
  'PD3.Rank': string;
  DPD3: string;
  'DPD3.Rank': string;
  PD2: string;
  'PD2.Rank': string;
  DPD2: string;
  'DPD2.Rank': string;
  PD1: string;
  'PD1.Rank': string;
  DPD1: string;
  'DPD1.Rank': string;
  [key: string]: string | number;
}

// ============================================================================
// DATA TYPES - CONFERENCE
// ============================================================================

/** Conference standings row */
export interface ConferenceStandingsData {
  Team: string;
  Seed: string;
  [key: string]: string;
}

/** Conference stats row (offense/defense) */
export type ConferenceStatsData = Record<string, string>;

/** Conference aggregate stats row */
export interface ConferenceAggregateData {
  Stat: string;
  Value: string;
  Rank: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Generic table row type (for dynamic parsing) */
export type TableRow = Record<string, string>;

/** File format options */
export type FileFormat = 'json' | 'csv' | 'auto' | 'text';

/** Spinner control interface */
export interface SpinnerControl {
  update: (message?: string) => void;
  stop: (finalMessage?: string, success?: boolean) => void;
}

// ============================================================================
// CLI TYPES
// ============================================================================

/** CLI options parsed from commander */
export interface CliOptions {
  // Category flags
  all?: boolean;
  allSingle?: boolean;
  allYearly?: boolean;
  allTeams?: boolean;

  // Single-fetch endpoints
  arenas?: boolean;
  programRatings?: boolean;
  trends?: boolean;
  hca?: boolean;

  // Yearly endpoints
  ratings?: boolean;
  efficiency?: boolean;
  fourFactors?: boolean;
  teamStats?: boolean;
  pointDist?: boolean;
  height?: boolean;
  playerStats?: boolean;
  kpoy?: boolean;
  refs?: boolean;
  gameAttribs?: boolean;

  // Team endpoints
  validTeams?: boolean;
  schedule?: boolean;

  // Date endpoints
  fanmatch?: boolean;
  fanmatchDate?: string;

  // Parameters
  year?: number;
  start?: number;
  end?: number;
  team?: string;
  conference?: string;
  metric?: string;
  allMetrics?: boolean;
  defense?: boolean;

  // Options
  outputDir?: string;
  logLevel?: string;
  client?: string;
  dryRun?: boolean;
  examples?: boolean;
}

// ============================================================================
// ENDPOINT DEFINITIONS
// ============================================================================

/** Endpoint URL patterns */
export interface Endpoints {
  INDEX: string;
  LOGIN_HANDLER: string;
  POMEROY_RATINGS: string;
  TRENDS: string;
  REFS: string;
  HCA: string;
  ARENAS: string;
  GAME_ATTRIBS: string;
  PROGRAM_RATINGS: string;
  EFFICIENCY: string;
  FOUR_FACTORS: string;
  TEAM_STATS: string;
  POINT_DIST: string;
  HEIGHT: string;
  PLAYER_STATS: string;
  KPOY: string;
  VALID_TEAMS: string;
  TEAM: string;
  FANMATCH: string;
  CONFERENCE: string;
  CONFERENCE_STATS: string;
}

/** URL query parameters */
export type QueryParams = Record<string, string | number | undefined | null>;
