/**
 * Utils module tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  parseTable,
  parseTableElement,
  extractText,
  extractSeason,
  extractTeamNames,
  generateYearRange,
  generateDateRange,
  ncaamStartDate,
  ncaamEndDate,
  randomDelay,
  writeToFile,
  readFromFile,
  pause,
  randomPause,
} from '../utils.js';

describe('utils', () => {
  describe('parseTable', () => {
    const simpleTableHtml = `
      <html>
        <body>
          <table>
            <thead>
              <tr><th>Rank</th><th>Team</th><th>Rating</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Duke</td><td>25.5</td></tr>
              <tr><td>2</td><td>UNC</td><td>24.3</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    it('should parse simple table', () => {
      const rows = parseTable(simpleTableHtml);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ Rank: '1', Team: 'Duke', Rating: '25.5' });
      expect(rows[1]).toEqual({ Rank: '2', Team: 'UNC', Rating: '24.3' });
    });

    it('should throw for missing table', () => {
      const html = '<html><body><p>No table here</p></body></html>';
      expect(() => parseTable(html)).toThrow('No tables found');
    });

    it('should parse table with custom selector', () => {
      const html = `
        <table id="not-this"></table>
        <table id="ratings-table">
          <tr><th>A</th></tr>
          <tr><td>1</td></tr>
        </table>
      `;
      const rows = parseTable(html, '#ratings-table');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ A: '1' });
    });

    it('should handle table without thead', () => {
      const html = `
        <table>
          <tr><th>Col1</th><th>Col2</th></tr>
          <tr><td>A</td><td>B</td></tr>
        </table>
      `;
      const rows = parseTable(html);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ Col1: 'A', Col2: 'B' });
    });

    it('should handle duplicate header names', () => {
      const html = `
        <table>
          <tr><th>Name</th><th>Name</th></tr>
          <tr><td>A</td><td>B</td></tr>
        </table>
      `;
      const rows = parseTable(html);
      expect(rows[0]).toHaveProperty('Name');
      expect(rows[0]).toHaveProperty('Name_1');
    });
  });

  describe('extractText', () => {
    it('should extract text from selector', () => {
      const html = '<html><body><h1 id="title">Hello World</h1></body></html>';
      expect(extractText(html, '#title')).toBe('Hello World');
    });

    it('should return null if not found', () => {
      const html = '<html><body><p>No match</p></body></html>';
      expect(extractText(html, '#missing')).toBeNull();
    });

    it('should trim whitespace', () => {
      const html = '<html><body><p id="test">  Trimmed  </p></body></html>';
      expect(extractText(html, '#test')).toBe('Trimmed');
    });
  });

  describe('extractSeason', () => {
    it('should extract season from title', () => {
      const html = '<html><head><title>2025 Pomeroy Ratings</title></head></html>';
      expect(extractSeason(html)).toBe(2025);
    });

    it('should extract from content header', () => {
      const html = `
        <html>
          <head><title>KenPom</title></head>
          <body>
            <div id="content-header"><h2>2024 Season</h2></div>
          </body>
        </html>
      `;
      expect(extractSeason(html)).toBe(2024);
    });

    it('should return null if no season found', () => {
      const html = '<html><head><title>KenPom</title></head></html>';
      expect(extractSeason(html)).toBeNull();
    });
  });

  describe('extractTeamNames', () => {
    it('should extract team names from links', () => {
      const html = `
        <html>
          <body>
            <a href="team.php?team=Duke">Duke</a>
            <a href="team.php?team=UNC">UNC</a>
            <a href="team.php?team=Kentucky">Kentucky</a>
          </body>
        </html>
      `;
      const teams = extractTeamNames(html);
      expect(teams).toContain('Duke');
      expect(teams).toContain('UNC');
      expect(teams).toContain('Kentucky');
    });

    it('should not include duplicates', () => {
      const html = `
        <html>
          <body>
            <a href="team.php?team=Duke">Duke</a>
            <a href="team.php?team=Duke">Duke</a>
          </body>
        </html>
      `;
      const teams = extractTeamNames(html);
      expect(teams.filter(t => t === 'Duke')).toHaveLength(1);
    });
  });

  describe('generateYearRange', () => {
    it('should generate inclusive range', () => {
      expect(generateYearRange(2020, 2025)).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
    });

    it('should handle single year', () => {
      expect(generateYearRange(2025, 2025)).toEqual([2025]);
    });

    it('should handle reversed range (empty)', () => {
      expect(generateYearRange(2025, 2020)).toEqual([]);
    });
  });

  describe('generateDateRange', () => {
    it('should generate date range', () => {
      const dates = generateDateRange('2025-01-01', '2025-01-03');
      expect(dates).toEqual(['2025-01-01', '2025-01-02', '2025-01-03']);
    });

    it('should handle single date', () => {
      const dates = generateDateRange('2025-01-01', '2025-01-01');
      expect(dates).toEqual(['2025-01-01']);
    });
  });

  describe('ncaamStartDate', () => {
    it('should return November 1 of previous year', () => {
      expect(ncaamStartDate(2025)).toBe('2024-11-01');
      expect(ncaamStartDate(2024)).toBe('2023-11-01');
    });
  });

  describe('ncaamEndDate', () => {
    it('should return April 30 of season year', () => {
      expect(ncaamEndDate(2025)).toBe('2025-04-30');
      expect(ncaamEndDate(2024)).toBe('2024-04-30');
    });
  });

  describe('randomDelay', () => {
    it('should return value in range', () => {
      for (let i = 0; i < 100; i++) {
        const delay = randomDelay(2000, 7000);
        expect(delay).toBeGreaterThanOrEqual(2000);
        expect(delay).toBeLessThanOrEqual(7000);
      }
    });
  });

  describe('writeToFile', () => {
    let testDir;

    beforeEach(() => {
      testDir = path.join(os.tmpdir(), `kenpom-test-${Date.now()}`);
    });

    afterEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    });

    it('should create directory if not exists', () => {
      const filepath = path.join(testDir, 'nested', 'dir', 'test.json');
      writeToFile({ test: 'data' }, filepath);
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('should write JSON by default', () => {
      const filepath = path.join(testDir, 'test.json');
      const data = { name: 'Duke', rating: 25.5 };
      writeToFile(data, filepath);
      const content = fs.readFileSync(filepath, 'utf-8');
      expect(JSON.parse(content)).toEqual(data);
    });

    it('should write CSV when .csv extension', () => {
      const filepath = path.join(testDir, 'test.csv');
      const data = [
        { Team: 'Duke', Rating: '25.5' },
        { Team: 'UNC', Rating: '24.3' },
      ];
      writeToFile(data, filepath);
      const content = fs.readFileSync(filepath, 'utf-8');
      expect(content).toContain('Team,Rating');
      expect(content).toContain('Duke,25.5');
      expect(content).toContain('UNC,24.3');
    });

    it('should escape CSV values with commas', () => {
      const filepath = path.join(testDir, 'test.csv');
      const data = [{ Name: 'Duke, NC', Value: '100' }];
      writeToFile(data, filepath);
      const content = fs.readFileSync(filepath, 'utf-8');
      expect(content).toContain('"Duke, NC"');
    });

    it('should escape CSV values with quotes', () => {
      const filepath = path.join(testDir, 'test.csv');
      const data = [{ Name: 'The "Blue Devils"', Value: '100' }];
      writeToFile(data, filepath);
      const content = fs.readFileSync(filepath, 'utf-8');
      expect(content).toContain('"The ""Blue Devils"""');
    });

    it('should write string data as-is', () => {
      const filepath = path.join(testDir, 'test.txt');
      const data = 'Hello, World!';
      writeToFile(data, filepath, 'text');
      const content = fs.readFileSync(filepath, 'utf-8');
      expect(content).toBe(data);
    });
  });

  describe('readFromFile', () => {
    let testDir;

    beforeEach(() => {
      testDir = path.join(os.tmpdir(), `kenpom-test-${Date.now()}`);
      fs.mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    });

    it('should throw for non-existent file', () => {
      expect(() => readFromFile('/nonexistent/path/file.json')).toThrow('File not found');
    });

    it('should parse JSON for .json files', () => {
      const filepath = path.join(testDir, 'test.json');
      const data = { name: 'Duke', rating: 25.5 };
      fs.writeFileSync(filepath, JSON.stringify(data));
      const result = readFromFile(filepath);
      expect(result).toEqual(data);
    });

    it('should return text for non-json files', () => {
      const filepath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';
      fs.writeFileSync(filepath, content);
      const result = readFromFile(filepath);
      expect(result).toBe(content);
    });

    it('should respect explicit format parameter', () => {
      const filepath = path.join(testDir, 'data.json');
      const content = '{"raw": "json"}';
      fs.writeFileSync(filepath, content);
      const result = readFromFile(filepath, 'text');
      expect(result).toBe(content);
    });
  });

  describe('pause', () => {
    it('should return a promise that resolves', async () => {
      const result = await pause(1);
      expect(result).toBeUndefined();
    });

    it('should resolve after delay', async () => {
      const start = Date.now();
      await pause(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some timing variance
    });
  });

  describe('randomPause', () => {
    it('should return a promise that resolves', async () => {
      const result = await randomPause(1, 2);
      expect(result).toBeUndefined();
    });

    it('should pause within range', async () => {
      const start = Date.now();
      await randomPause(50, 100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow timing variance
      expect(elapsed).toBeLessThan(200); // Upper bound with buffer
    });
  });
});
