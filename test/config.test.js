/**
 * Config module tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BASE_URL,
  ENDPOINTS,
  MIN_SEASONS,
  PLAYER_METRICS,
  GAME_ATTRIB_METRICS,
  CONFERENCES,
  getKenpomCredentials,
  validateSeason,
  validatePlayerMetric,
  validateGameAttribMetric,
  validateConference,
  encodeTeamName,
  buildUrl,
} from '../config.js';

describe('config', () => {
  describe('constants', () => {
    it('should have correct BASE_URL', () => {
      expect(BASE_URL).toBe('https://kenpom.com');
    });

    it('should have all required endpoints', () => {
      expect(ENDPOINTS.INDEX).toBe('/index.php');
      expect(ENDPOINTS.LOGIN_HANDLER).toBe('/handlers/login_handler.php');
      expect(ENDPOINTS.POMEROY_RATINGS).toBe('/index.php');
      expect(ENDPOINTS.EFFICIENCY).toBe('/summary.php');
      expect(ENDPOINTS.FOUR_FACTORS).toBe('/stats.php');
      expect(ENDPOINTS.PLAYER_STATS).toBe('/playerstats.php');
    });

    it('should have all player metrics', () => {
      expect(PLAYER_METRICS).toContain('ORtg');
      expect(PLAYER_METRICS).toContain('eFG');
      expect(PLAYER_METRICS).toContain('2P');
      expect(PLAYER_METRICS).toContain('3P');
      expect(PLAYER_METRICS).toContain('FT');
      expect(PLAYER_METRICS.length).toBe(18);
    });

    it('should have all game attribute metrics', () => {
      expect(GAME_ATTRIB_METRICS).toContain('Excitement');
      expect(GAME_ATTRIB_METRICS).toContain('Tension');
      expect(GAME_ATTRIB_METRICS.length).toBe(7);
    });

    it('should have conference codes', () => {
      expect(CONFERENCES).toContain('ACC');
      expect(CONFERENCES).toContain('B10');
      expect(CONFERENCES).toContain('SEC');
      expect(CONFERENCES.length).toBeGreaterThan(20);
    });
  });

  describe('getKenpomCredentials', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return provided credentials', () => {
      const creds = getKenpomCredentials({
        email: 'test@example.com',
        password: 'testpass',
      });
      expect(creds.email).toBe('test@example.com');
      expect(creds.password).toBe('testpass');
    });

    it('should read from environment variables', () => {
      process.env.KENPOM_EMAIL = 'env@example.com';
      process.env.KENPOM_PASSWORD = 'envpass';

      const creds = getKenpomCredentials();
      expect(creds.email).toBe('env@example.com');
      expect(creds.password).toBe('envpass');
    });

    it('should throw if email is missing', () => {
      delete process.env.KENPOM_EMAIL;
      delete process.env.KENPOM_PASSWORD;

      expect(() => getKenpomCredentials()).toThrow('KenPom email not found');
    });

    it('should throw if password is missing', () => {
      process.env.KENPOM_EMAIL = 'test@example.com';
      delete process.env.KENPOM_PASSWORD;

      expect(() => getKenpomCredentials()).toThrow('KenPom password not found');
    });
  });

  describe('validateSeason', () => {
    it('should not throw for valid season', () => {
      expect(() => validateSeason(2020, 'POMEROY_RATINGS')).not.toThrow();
      expect(() => validateSeason(2025, 'PLAYER_STATS')).not.toThrow();
    });

    it('should throw for season before minimum', () => {
      expect(() => validateSeason(1998, 'POMEROY_RATINGS')).toThrow('before minimum year 1999');
      expect(() => validateSeason(2003, 'PLAYER_STATS')).toThrow('before minimum year 2004');
      expect(() => validateSeason(2015, 'REFS')).toThrow('before minimum year 2016');
    });

    it('should not throw for null season', () => {
      expect(() => validateSeason(null, 'POMEROY_RATINGS')).not.toThrow();
    });
  });

  describe('validatePlayerMetric', () => {
    it('should not throw for valid metrics', () => {
      expect(() => validatePlayerMetric('eFG')).not.toThrow();
      expect(() => validatePlayerMetric('ORtg')).not.toThrow();
      expect(() => validatePlayerMetric('2P')).not.toThrow();
    });

    it('should throw for invalid metric', () => {
      expect(() => validatePlayerMetric('invalid')).toThrow("Invalid metric 'invalid'");
      expect(() => validatePlayerMetric('PPG')).toThrow("Invalid metric 'PPG'");
    });
  });

  describe('validateGameAttribMetric', () => {
    it('should not throw for valid metrics', () => {
      expect(() => validateGameAttribMetric('Excitement')).not.toThrow();
      expect(() => validateGameAttribMetric('Tension')).not.toThrow();
    });

    it('should throw for invalid metric', () => {
      expect(() => validateGameAttribMetric('invalid')).toThrow("Invalid metric 'invalid'");
    });
  });

  describe('validateConference', () => {
    it('should not throw for valid conferences', () => {
      expect(() => validateConference('ACC')).not.toThrow();
      expect(() => validateConference('B10')).not.toThrow();
    });

    it('should throw for invalid conference', () => {
      expect(() => validateConference('INVALID')).toThrow("Invalid conference 'INVALID'");
    });

    it('should not throw for null', () => {
      expect(() => validateConference(null)).not.toThrow();
    });
  });

  describe('encodeTeamName', () => {
    it('should encode spaces as +', () => {
      expect(encodeTeamName('North Carolina')).toBe('North+Carolina');
    });

    it('should encode & as %26', () => {
      expect(encodeTeamName('Texas A&M')).toBe('Texas+A%26M');
    });

    it('should handle both spaces and &', () => {
      expect(encodeTeamName('Texas A&M Commerce')).toBe('Texas+A%26M+Commerce');
    });
  });

  describe('buildUrl', () => {
    it('should build URL without params', () => {
      const url = buildUrl('/index.php');
      expect(url).toBe('https://kenpom.com/index.php');
    });

    it('should build URL with params', () => {
      const url = buildUrl('/index.php', { y: 2025 });
      expect(url).toBe('https://kenpom.com/index.php?y=2025');
    });

    it('should ignore null/undefined params', () => {
      const url = buildUrl('/index.php', { y: 2025, s: null, c: undefined });
      expect(url).toBe('https://kenpom.com/index.php?y=2025');
    });

    it('should handle multiple params', () => {
      const url = buildUrl('/playerstats.php', { s: 'eFG', y: 2025, c: 'ACC' });
      expect(url).toContain('s=eFG');
      expect(url).toContain('y=2025');
      expect(url).toContain('c=ACC');
    });
  });
});
