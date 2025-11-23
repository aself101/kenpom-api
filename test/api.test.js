/**
 * API module tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KenpomAPI } from '../api.js';

// Mock utils module
vi.mock('../utils.js', () => ({
  parseTable: vi.fn(() => [{ team: 'Duke', rank: 1 }]),
  parseAllTables: vi.fn(() => [[{ team: 'Duke' }], [{ team: 'UNC' }]]),
  extractText: vi.fn(() => 'sample text'),
  extractSeason: vi.fn(() => 2025),
  extractTeamNames: vi.fn(() => ['Duke', 'North Carolina', 'Kansas']),
  createCloudscraperClient: vi.fn(),
  createPuppeteerClient: vi.fn(),
  pause: vi.fn(),
  randomPause: vi.fn(),
}));

// Mock parsers module
vi.mock('../parsers.js', () => ({
  parsePomeroyRatings: vi.fn(() => [{ Rk: '1', Team: 'Duke', Conf: 'ACC', Seed: '1' }]),
  parseEfficiency: vi.fn(() => [{ Team: 'Duke', Conference: 'ACC' }]),
  parseFourFactors: vi.fn(() => [{ Team: 'Duke', Conference: 'ACC', AdjTempo: '70.5' }]),
  parseTeamStats: vi.fn(() => [{ Team: 'Duke', Conference: 'ACC' }]),
  parsePointDist: vi.fn(() => [{ Team: 'Duke', Conference: 'ACC' }]),
  parseHeight: vi.fn(() => [{ Team: 'Duke', Conference: 'ACC', AvgHgt: '77.5' }]),
  parsePlayerStats: vi.fn(() => [{ Rank: '1', Player: 'John Doe', Team: 'Duke' }]),
  parseAllPlayerStatsTables: vi.fn(() => [[{ Rank: '1', Player: 'John Doe' }]]),
  parseKpoy: vi.fn(() => ({ kpoy: [{ Rank: '1', Player: 'John Doe' }], mvp: null })),
  parseRefs: vi.fn(() => [{ Rank: '1', Name: 'John Doe', Rating: '95.0' }]),
  parseHca: vi.fn(() => [{ Team: 'Duke', Conference: 'ACC', HCA: '4.5' }]),
  parseArenas: vi.fn(() => [{ Rank: '1', Team: 'Duke', Arena: 'Cameron Indoor' }]),
  parseGameAttribs: vi.fn(() => [{ Rank: '1', Date: '2025-01-01', Game: 'Duke vs UNC' }]),
  parseProgramRatings: vi.fn(() => [{ Rank: '1', Team: 'Duke', Rating: '25.5' }]),
  parseTrends: vi.fn(() => [{ Season: '2025', Tempo: '68.5' }]),
  parseSchedule: vi.fn(() => [{ Date: 'Nov 4', 'Opponent Name': 'Maine' }]),
  parseFanMatch: vi.fn(() => ({ games: [{ Game: 'Duke vs UNC' }], summary: null })),
  parseValidTeams: vi.fn(() => ['Duke', 'North Carolina', 'Kansas']),
  parseScoutingReport: vi.fn(() => ({ OE: 115.5, 'OE.Rank': 10, DE: 95.2, 'DE.Rank': 5 })),
  parseConferenceStandings: vi.fn(() => [{ Team: 'Duke', Seed: '1' }]),
  parseConferenceOffense: vi.fn(() => [{ Team: 'Duke', AdjOE: '115.5' }]),
  parseConferenceDefense: vi.fn(() => [{ Team: 'Duke', AdjDE: '95.2' }]),
  parseConferenceAggregateStats: vi.fn(() => [{ Stat: 'Tempo', Value: '68.5', Rank: '1' }]),
}));

// Mock config module partially (keep validators)
vi.mock('../config.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    getKenpomCredentials: vi.fn(() => ({
      email: 'test@example.com',
      password: 'testpass',
    })),
  };
});

describe('KenpomAPI', () => {
  let api;

  beforeEach(() => {
    vi.clearAllMocks();
    api = new KenpomAPI({ logLevel: 'NONE' });
  });

  afterEach(async () => {
    if (api?.client) {
      await api.close();
    }
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const instance = new KenpomAPI({ logLevel: 'NONE' });
      expect(instance.email).toBe('test@example.com');
      expect(instance.password).toBe('testpass');
      expect(instance.clientTier).toBe('auto');
      expect(instance.client).toBeNull();
      expect(instance.isLoggedIn).toBe(false);
    });

    it('should accept custom client tier', () => {
      const instance = new KenpomAPI({ clientTier: 'tier1', logLevel: 'NONE' });
      expect(instance.clientTier).toBe('tier1');
    });

    it('should accept custom log level', () => {
      const instance = new KenpomAPI({ logLevel: 'DEBUG' });
      expect(instance.logger.level).toBe('debug');
    });

    it('should set silent mode with NONE log level', () => {
      const instance = new KenpomAPI({ logLevel: 'NONE' });
      expect(instance.logger.transports[0].silent).toBe(true);
    });
  });

  describe('_verifySession', () => {
    it('should throw if client is null', () => {
      expect(() => api._verifySession()).toThrow('Not logged in. Call login() first.');
    });

    it('should throw if not logged in', () => {
      api.client = {};
      api.isLoggedIn = false;
      expect(() => api._verifySession()).toThrow('Not logged in. Call login() first.');
    });

    it('should not throw if logged in', () => {
      api.client = {};
      api.isLoggedIn = true;
      expect(() => api._verifySession()).not.toThrow();
    });
  });

  describe('_getHtml', () => {
    it('should fetch with tier1 client', async () => {
      const mockGet = vi.fn((url, callback) => {
        callback(null, {}, '<html>test</html>');
      });
      api.client = { get: mockGet };
      api.clientType = 'tier1';

      const html = await api._getHtml('https://kenpom.com/test');

      expect(mockGet).toHaveBeenCalledWith('https://kenpom.com/test', expect.any(Function));
      expect(html).toBe('<html>test</html>');
    });

    it('should handle tier1 errors', async () => {
      const mockGet = vi.fn((url, callback) => {
        callback(new Error('Network error'), null, null);
      });
      api.client = { get: mockGet };
      api.clientType = 'tier1';

      await expect(api._getHtml('https://kenpom.com/test')).rejects.toThrow('Network error');
    });

    it('should fetch with tier2 client', async () => {
      const mockPage = {
        goto: vi.fn(),
        content: vi.fn().mockResolvedValue('<html>tier2</html>'),
      };
      api.client = { page: mockPage };
      api.clientType = 'tier2';

      const html = await api._getHtml('https://kenpom.com/test');

      expect(mockPage.goto).toHaveBeenCalledWith('https://kenpom.com/test', { waitUntil: 'networkidle2' });
      expect(html).toBe('<html>tier2</html>');
    });

    it('should throw for unknown client type', async () => {
      api.client = {};
      api.clientType = 'unknown';

      await expect(api._getHtml('https://kenpom.com/test')).rejects.toThrow('Unknown client type: unknown');
    });
  });

  describe('login', () => {
    it('should try tiers in order when auto', async () => {
      const { createCloudscraperClient, createPuppeteerClient } = await import('../utils.js');

      // First tier fails
      createCloudscraperClient.mockRejectedValueOnce(new Error('Cloudscraper failed'));

      // Second tier succeeds
      const mockPage = {
        goto: vi.fn(),
        type: vi.fn(),
        click: vi.fn(),
        waitForNavigation: vi.fn(),
        content: vi.fn().mockResolvedValue('Logged in as test@example.com'),
      };
      createPuppeteerClient.mockResolvedValueOnce({
        browser: {},
        page: mockPage,
        close: vi.fn(),
      });

      await api.login();

      expect(createCloudscraperClient).toHaveBeenCalled();
      expect(createPuppeteerClient).toHaveBeenCalled();
      expect(api.clientType).toBe('tier2');
      expect(api.isLoggedIn).toBe(true);
    });

    it('should use only specified tier when not auto', async () => {
      const { createPuppeteerClient } = await import('../utils.js');

      const mockPage = {
        goto: vi.fn(),
        type: vi.fn(),
        click: vi.fn(),
        waitForNavigation: vi.fn(),
        content: vi.fn().mockResolvedValue('Logged in as test@example.com'),
      };
      createPuppeteerClient.mockResolvedValueOnce({
        browser: {},
        page: mockPage,
        close: vi.fn(),
      });

      const instance = new KenpomAPI({ clientTier: 'tier2', logLevel: 'NONE' });
      await instance.login();

      expect(createPuppeteerClient).toHaveBeenCalled();
      expect(instance.clientType).toBe('tier2');
    });

    it('should throw if all tiers fail', async () => {
      const { createCloudscraperClient, createPuppeteerClient } = await import('../utils.js');

      createCloudscraperClient.mockRejectedValueOnce(new Error('Cloudscraper failed'));
      createPuppeteerClient.mockRejectedValueOnce(new Error('Puppeteer failed'));

      await expect(api.login()).rejects.toThrow('All login attempts failed');
    });
  });

  describe('_loginWithTier', () => {
    it('should throw for unknown tier', async () => {
      await expect(api._loginWithTier('invalid')).rejects.toThrow('Unknown client tier: invalid');
    });
  });

  describe('close', () => {
    it('should close tier2 client', async () => {
      const mockClose = vi.fn();
      api.client = {};
      api.clientType = 'tier2';
      api._closePuppeteer = mockClose;
      api.isLoggedIn = true;

      await api.close();

      expect(mockClose).toHaveBeenCalled();
      expect(api.client).toBeNull();
      expect(api.isLoggedIn).toBe(false);
    });

    it('should handle tier1 clients', async () => {
      api.client = {};
      api.clientType = 'tier1';
      api.isLoggedIn = true;

      await api.close();

      expect(api.client).toBeNull();
      expect(api.isLoggedIn).toBe(false);
    });
  });

  describe('endpoint methods', () => {
    beforeEach(() => {
      // Setup logged-in state
      api.client = {
        get: vi.fn((url, callback) => {
          callback(null, {}, '<html><table></table></html>');
        }),
      };
      api.clientType = 'tier1';
      api.isLoggedIn = true;
    });

    describe('getPomeroyRatings', () => {
      it('should fetch ratings', async () => {
        const result = await api.getPomeroyRatings(2025);
        expect(result).toEqual([{ Rk: '1', Team: 'Duke', Conf: 'ACC', Seed: '1' }]);
      });

      it('should throw for invalid season', async () => {
        await expect(api.getPomeroyRatings(1998)).rejects.toThrow('before minimum year 1999');
      });

      it('should work without season', async () => {
        const result = await api.getPomeroyRatings();
        expect(result).toEqual([{ Rk: '1', Team: 'Duke', Conf: 'ACC', Seed: '1' }]);
      });
    });

    describe('getTrends', () => {
      it('should fetch trends', async () => {
        const result = await api.getTrends();
        expect(result).toEqual([{ Season: '2025', Tempo: '68.5' }]);
      });
    });

    describe('getRefs', () => {
      it('should fetch refs', async () => {
        const result = await api.getRefs(2020);
        expect(result).toEqual([{ Rank: '1', Name: 'John Doe', Rating: '95.0' }]);
      });

      it('should throw for season before 2016', async () => {
        await expect(api.getRefs(2015)).rejects.toThrow('before minimum year 2016');
      });
    });

    describe('getHca', () => {
      it('should fetch HCA', async () => {
        const result = await api.getHca();
        expect(result).toEqual([{ Team: 'Duke', Conference: 'ACC', HCA: '4.5' }]);
      });
    });

    describe('getArenas', () => {
      it('should fetch arenas', async () => {
        const result = await api.getArenas(2020);
        expect(result).toEqual([{ Rank: '1', Team: 'Duke', Arena: 'Cameron Indoor' }]);
      });

      it('should throw for season before 2010', async () => {
        await expect(api.getArenas(2009)).rejects.toThrow('before minimum year 2010');
      });
    });

    describe('getGameAttribs', () => {
      it('should fetch game attributes', async () => {
        const result = await api.getGameAttribs(2020, 'Excitement');
        expect(result).toEqual([{ Rank: '1', Date: '2025-01-01', Game: 'Duke vs UNC' }]);
      });

      it('should throw for invalid metric', async () => {
        await expect(api.getGameAttribs(2020, 'Invalid')).rejects.toThrow("Invalid metric 'Invalid'");
      });
    });

    describe('getProgramRatings', () => {
      it('should fetch program ratings', async () => {
        const result = await api.getProgramRatings();
        expect(result).toEqual([{ Rank: '1', Team: 'Duke', Rating: '25.5' }]);
      });
    });

    describe('getEfficiency', () => {
      it('should fetch efficiency', async () => {
        const result = await api.getEfficiency(2020);
        expect(result).toEqual([{ Team: 'Duke', Conference: 'ACC' }]);
      });
    });

    describe('getFourFactors', () => {
      it('should fetch four factors', async () => {
        const result = await api.getFourFactors(2020);
        expect(result).toEqual([{ Team: 'Duke', Conference: 'ACC', AdjTempo: '70.5' }]);
      });
    });

    describe('getTeamStats', () => {
      it('should fetch team stats', async () => {
        const result = await api.getTeamStats(2020);
        expect(result).toEqual([{ Team: 'Duke', Conference: 'ACC' }]);
      });

      it('should accept defense flag', async () => {
        const result = await api.getTeamStats(2020, true);
        expect(result).toEqual([{ Team: 'Duke', Conference: 'ACC' }]);
      });
    });

    describe('getPointDist', () => {
      it('should fetch point distribution', async () => {
        const result = await api.getPointDist(2020);
        expect(result).toEqual([{ Team: 'Duke', Conference: 'ACC' }]);
      });
    });

    describe('getHeight', () => {
      it('should fetch height/experience', async () => {
        const result = await api.getHeight(2020);
        expect(result).toEqual([{ Team: 'Duke', Conference: 'ACC', AvgHgt: '77.5' }]);
      });

      it('should throw for season before 2007', async () => {
        await expect(api.getHeight(2006)).rejects.toThrow('before minimum year 2007');
      });
    });

    describe('getPlayerStats', () => {
      it('should fetch player stats', async () => {
        const result = await api.getPlayerStats(2020, 'eFG');
        expect(result).toEqual([{ Rank: '1', Player: 'John Doe', Team: 'Duke' }]);
      });

      it('should throw for invalid metric', async () => {
        await expect(api.getPlayerStats(2020, 'Invalid')).rejects.toThrow("Invalid metric 'Invalid'");
      });

      it('should throw for season before 2004', async () => {
        await expect(api.getPlayerStats(2003)).rejects.toThrow('before minimum year 2004');
      });

      it('should accept conference filter', async () => {
        const result = await api.getPlayerStats(2020, 'eFG', 'ACC');
        expect(result).toEqual([{ Rank: '1', Player: 'John Doe', Team: 'Duke' }]);
      });

      it('should throw for invalid conference', async () => {
        await expect(api.getPlayerStats(2020, 'eFG', 'INVALID')).rejects.toThrow("Invalid conference 'INVALID'");
      });
    });

    describe('getAllPlayerStats', () => {
      it('should fetch all player metrics', async () => {
        const result = await api.getAllPlayerStats(2020);

        // Should have results for each metric
        expect(Object.keys(result).length).toBe(18);
        // ORtg uses parseAllPlayerStatsTables, others use parsePlayerStats
        expect(result.eFG).toEqual([{ Rank: '1', Player: 'John Doe', Team: 'Duke' }]);
        expect(result.ORtg).toEqual([[{ Rank: '1', Player: 'John Doe' }]]);
      });
    });

    describe('getKpoy', () => {
      it('should fetch KPOY data', async () => {
        const result = await api.getKpoy(2020);
        expect(result).toEqual({ kpoy: [{ Rank: '1', Player: 'John Doe' }], mvp: null });
      });
    });

    describe('getValidTeams', () => {
      it('should fetch valid teams', async () => {
        const result = await api.getValidTeams(2020);
        expect(result).toEqual(['Duke', 'North Carolina', 'Kansas']);
      });
    });

    describe('getSchedule', () => {
      it('should fetch team schedule', async () => {
        const result = await api.getSchedule('Duke', 2020);
        expect(result).toEqual([{ Date: 'Nov 4', 'Opponent Name': 'Maine' }]);
      });

      it('should throw if team is not provided', async () => {
        await expect(api.getSchedule(null)).rejects.toThrow('Team name is required');
      });

      it('should throw if team is empty', async () => {
        await expect(api.getSchedule('')).rejects.toThrow('Team name is required');
      });
    });

    describe('getFanMatch', () => {
      it('should fetch fanmatch data', async () => {
        const result = await api.getFanMatch('2025-03-15');
        expect(result.date).toBe('2025-03-15');
        expect(result.games).toEqual([{ Game: 'Duke vs UNC' }]);
        expect(result.summary).toBeNull();
      });

      it('should use today if no date provided', async () => {
        const result = await api.getFanMatch();
        expect(result.date).toBeDefined();
        expect(result.games).toEqual([{ Game: 'Duke vs UNC' }]);
      });
    });

    describe('getScoutingReport', () => {
      it('should fetch scouting report', async () => {
        const result = await api.getScoutingReport('Duke', 2020);
        expect(result.OE).toBe(115.5);
        expect(result['OE.Rank']).toBe(10);
      });

      it('should throw if team is not provided', async () => {
        await expect(api.getScoutingReport(null)).rejects.toThrow('Team name is required');
      });
    });

    describe('getConferenceStandings', () => {
      it('should fetch conference standings', async () => {
        const result = await api.getConferenceStandings('ACC', 2020);
        expect(result).toEqual([{ Team: 'Duke', Seed: '1' }]);
      });

      it('should throw if conference is not provided', async () => {
        await expect(api.getConferenceStandings(null)).rejects.toThrow('Conference code is required');
      });

      it('should throw for invalid conference', async () => {
        await expect(api.getConferenceStandings('INVALID')).rejects.toThrow("Invalid conference 'INVALID'");
      });
    });

    describe('getConferenceOffense', () => {
      it('should fetch conference offense stats', async () => {
        const result = await api.getConferenceOffense('ACC', 2020);
        expect(result).toEqual([{ Team: 'Duke', AdjOE: '115.5' }]);
      });
    });

    describe('getConferenceDefense', () => {
      it('should fetch conference defense stats', async () => {
        const result = await api.getConferenceDefense('ACC', 2020);
        expect(result).toEqual([{ Team: 'Duke', AdjDE: '95.2' }]);
      });
    });

    describe('getConferenceStats', () => {
      it('should fetch aggregate stats for a conference', async () => {
        const result = await api.getConferenceStats('ACC', 2020);
        expect(result).toEqual([{ Stat: 'Tempo', Value: '68.5', Rank: '1' }]);
      });

      it('should fetch aggregate stats for all conferences', async () => {
        const result = await api.getConferenceStats(null, 2020);
        expect(result).toEqual([{ Stat: 'Tempo', Value: '68.5', Rank: '1' }]);
      });
    });

    describe('getCurrentSeason', () => {
      it('should fetch current season', async () => {
        const result = await api.getCurrentSeason();
        expect(result).toBe(2025);
      });

      it('should throw if season cannot be determined', async () => {
        const { extractSeason } = await import('../utils.js');
        extractSeason.mockReturnValueOnce(null);

        await expect(api.getCurrentSeason()).rejects.toThrow('Could not determine current season');
      });
    });
  });

  describe('session verification on endpoints', () => {
    it('should throw for all endpoints when not logged in', async () => {
      const endpoints = [
        ['getPomeroyRatings', []],
        ['getTrends', []],
        ['getRefs', []],
        ['getHca', []],
        ['getArenas', []],
        ['getGameAttribs', []],
        ['getProgramRatings', []],
        ['getEfficiency', []],
        ['getFourFactors', []],
        ['getTeamStats', []],
        ['getPointDist', []],
        ['getHeight', []],
        ['getPlayerStats', []],
        ['getKpoy', []],
        ['getValidTeams', []],
        ['getSchedule', ['Duke']],
        ['getFanMatch', []],
        ['getScoutingReport', ['Duke']],
        ['getConferenceStandings', ['ACC']],
        ['getConferenceOffense', ['ACC']],
        ['getConferenceDefense', ['ACC']],
        ['getConferenceStats', []],
        ['getCurrentSeason', []],
      ];

      for (const [method, args] of endpoints) {
        await expect(api[method](...args)).rejects.toThrow('Not logged in');
      }
    });
  });
});
