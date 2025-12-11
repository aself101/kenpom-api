/**
 * Parser Unit Tests
 *
 * Tests for all parser functions in parsers.js using realistic HTML fixtures.
 * These tests verify actual parsing logic, not mocked behavior.
 */

import { describe, it, expect } from 'vitest';
import {
  stripSeed,
  extractSeed,
  parsePomeroyRatings,
  parseEfficiency,
  parseFourFactors,
  parseTeamStats,
  parsePointDist,
  parseHeight,
  parsePlayerStats,
  parseKpoy,
  parseRefs,
  parseHca,
  parseArenas,
  parseGameAttribs,
  parseProgramRatings,
  parseTrends,
  parseSchedule,
  parseFanMatch,
  parseGameResult,
  parseValidTeams,
  parseScoutingReport,
  parseConferenceStandings,
  parseConferenceOffense,
  parseConferenceDefense,
  parseConferenceAggregateStats
} from '../dist/parsers.js';

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('stripSeed', () => {
  it('should remove numeric seed from team name', () => {
    expect(stripSeed('Duke 1')).toBe('Duke');
    expect(stripSeed('Kansas 2')).toBe('Kansas');
  });

  it('should handle team names with no seed', () => {
    expect(stripSeed('Duke')).toBe('Duke');
    expect(stripSeed('North Carolina')).toBe('North Carolina');
  });

  it('should handle multi-digit seeds', () => {
    expect(stripSeed('Duke 16')).toBe('Duke');
    expect(stripSeed('Some Team 14')).toBe('Some Team');
  });

  it('should handle null/undefined', () => {
    // TypeScript version returns empty string for null/undefined
    expect(stripSeed(null)).toBe('');
    expect(stripSeed(undefined)).toBe('');
  });

  it('should handle empty string', () => {
    expect(stripSeed('')).toBe('');
  });

  it('should handle team names with numbers in the name', () => {
    // St. Mary's doesn't have numbers, but team like "Team 10" (if existed) would strip all
    expect(stripSeed('Team 10')).toBe('Team');
  });
});

describe('extractSeed', () => {
  it('should extract numeric seed from team name', () => {
    expect(extractSeed('Duke 1')).toBe('1');
    expect(extractSeed('Kansas 2')).toBe('2');
  });

  it('should return null for teams without seed', () => {
    expect(extractSeed('Duke')).toBe(null);
    expect(extractSeed('North Carolina')).toBe(null);
  });

  it('should extract multi-digit seeds', () => {
    expect(extractSeed('Duke 16')).toBe('16');
    expect(extractSeed('Some Team 14')).toBe('14');
  });

  it('should handle null/undefined', () => {
    expect(extractSeed(null)).toBe(null);
    expect(extractSeed(undefined)).toBe(null);
  });

  it('should return first number if multiple present', () => {
    expect(extractSeed('Duke 1 2')).toBe('1');
  });
});

// ============================================================================
// POMEROY RATINGS PARSER TESTS
// ============================================================================

describe('parsePomeroyRatings', () => {
  const sampleHtml = `
    <table>
      <thead>
        <tr><th>Rk</th><th>Team</th><th>Conf</th><th>W-L</th><th>AdjEM</th><th>AdjO</th><th>AdjO Rank</th><th>AdjD</th><th>AdjD Rank</th><th>AdjT</th><th>AdjT Rank</th><th>Luck</th><th>Luck Rank</th><th>SOS AdjEM</th><th>SOS AdjEM Rank</th><th>SOS OppO</th><th>SOS OppO Rank</th><th>SOS OppD</th><th>SOS OppD Rank</th><th>NCSOS AdjEM</th><th>NCSOS AdjEM Rank</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>Duke 1</td><td>ACC</td><td>30-5</td><td>+32.50</td><td>120.1</td><td>1</td><td>87.6</td><td>1</td><td>68.5</td><td>120</td><td>+0.05</td><td>150</td><td>+10.5</td><td>5</td><td>115.2</td><td>3</td><td>104.7</td><td>8</td><td>+2.5</td><td>15</td></tr>
        <tr><td>2</td><td>Kansas</td><td>B12</td><td>28-7</td><td>+30.20</td><td>118.5</td><td>3</td><td>88.3</td><td>2</td><td>69.2</td><td>100</td><td>-0.02</td><td>180</td><td>+9.8</td><td>8</td><td>114.8</td><td>5</td><td>105.0</td><td>12</td><td>+1.8</td><td>22</td></tr>
        <tr><td>Rk</td><td>Team</td><td>Conf</td><td>W-L</td><td>AdjEM</td><td>AdjO</td><td>AdjO Rank</td><td>AdjD</td><td>AdjD Rank</td><td>AdjT</td><td>AdjT Rank</td><td>Luck</td><td>Luck Rank</td><td>SOS AdjEM</td><td>SOS AdjEM Rank</td><td>SOS OppO</td><td>SOS OppO Rank</td><td>SOS OppD</td><td>SOS OppD Rank</td><td>NCSOS AdjEM</td><td>NCSOS AdjEM Rank</td></tr>
      </tbody>
    </table>
  `;

  it('should parse standard ratings table', () => {
    const result = parsePomeroyRatings(sampleHtml);

    expect(result).toHaveLength(2);
    expect(result[0].Rk).toBe('1');
    expect(result[0].Team).toBe('Duke');
    expect(result[0].Conf).toBe('ACC');
    expect(result[0]['W-L']).toBe('30-5');
    expect(result[0].AdjEM).toBe('+32.50');
  });

  it('should extract seed from team name', () => {
    const result = parsePomeroyRatings(sampleHtml);

    expect(result[0].Seed).toBe('1');
    expect(result[0].Team).toBe('Duke'); // Seed stripped
  });

  it('should set empty seed for teams without seed', () => {
    const result = parsePomeroyRatings(sampleHtml);

    expect(result[1].Seed).toBe('');
    expect(result[1].Team).toBe('Kansas');
  });

  it('should filter out repeated header rows in body', () => {
    const result = parsePomeroyRatings(sampleHtml);

    // Should only have 2 data rows, not the header row that appears in tbody
    expect(result).toHaveLength(2);
    expect(result.every(r => r.Rk !== 'Rk')).toBe(true);
  });

  it('should throw error when no tables found', () => {
    expect(() => parsePomeroyRatings('<div>No tables here</div>')).toThrow('No tables found');
  });
});

// ============================================================================
// EFFICIENCY PARSER TESTS
// ============================================================================

describe('parseEfficiency', () => {
  const post2010Html = `
    <table>
      <thead>
        <tr><th>Team</th><th>Conference</th><th>Tempo-Adj</th><th>Tempo-Adj Rank</th><th>Tempo-Raw</th><th>Tempo-Raw Rank</th><th>Avg.Poss.Length-Off</th><th>Avg.Poss.Length-Off Rank</th><th>Avg.Poss.Length-Def</th><th>Avg.Poss.Length-Def Rank</th><th>Off.Efficiency-Adj</th><th>Off.Efficiency-Adj Rank</th><th>Off.Efficiency-Raw</th><th>Off.Efficiency-Raw Rank</th><th>Def.Efficiency-Adj</th><th>Def.Efficiency-Adj Rank</th><th>Def.Efficiency-Raw</th><th>Def.Efficiency-Raw Rank</th></tr>
      </thead>
      <tbody>
        <tr><td>Duke 1</td><td>ACC</td><td>68.5</td><td>120</td><td>70.2</td><td>115</td><td>15.5</td><td>50</td><td>16.2</td><td>75</td><td>120.1</td><td>1</td><td>118.5</td><td>2</td><td>87.6</td><td>1</td><td>89.2</td><td>3</td></tr>
      </tbody>
    </table>
  `;

  const pre2010Html = `
    <table>
      <thead>
        <tr><th>Team</th><th>Conference</th><th>Tempo-Adj</th><th>Tempo-Adj Rank</th><th>Tempo-Raw</th><th>Tempo-Raw Rank</th><th>Off.Efficiency-Adj</th><th>Off.Efficiency-Adj Rank</th><th>Off.Efficiency-Raw</th><th>Off.Efficiency-Raw Rank</th><th>Def.Efficiency-Adj</th><th>Def.Efficiency-Adj Rank</th><th>Def.Efficiency-Raw</th><th>Def.Efficiency-Raw Rank</th></tr>
      </thead>
      <tbody>
        <tr><td>Duke</td><td>ACC</td><td>68.5</td><td>120</td><td>70.2</td><td>115</td><td>120.1</td><td>1</td><td>118.5</td><td>2</td><td>87.6</td><td>1</td><td>89.2</td><td>3</td></tr>
      </tbody>
    </table>
  `;

  it('should parse 2010+ efficiency table with 18 columns', () => {
    const result = parseEfficiency(post2010Html, 2025);

    expect(result).toHaveLength(1);
    expect(result[0].Team).toBe('Duke');
    expect(result[0].Conference).toBe('ACC');
    expect(result[0]['Avg.Poss.Length-Off']).toBe('15.5');
  });

  it('should parse pre-2010 efficiency table with 14 columns', () => {
    const result = parseEfficiency(pre2010Html, 2009);

    expect(result).toHaveLength(1);
    expect(result[0].Team).toBe('Duke');
    expect(result[0]['Off.Efficiency-Adj']).toBe('120.1');
    // Should not have Avg.Poss.Length columns
    expect(result[0]['Avg.Poss.Length-Off']).toBeUndefined();
  });

  it('should strip seed from team name', () => {
    const result = parseEfficiency(post2010Html, 2025);
    expect(result[0].Team).toBe('Duke'); // Not "Duke 1"
  });

  it('should filter header rows', () => {
    const htmlWithHeaderInBody = `
      <table>
        <thead><tr><th>Team</th><th>Conference</th></tr></thead>
        <tbody>
          <tr><td>Team</td><td>Conference</td></tr>
          <tr><td>Duke</td><td>ACC</td></tr>
        </tbody>
      </table>
    `;
    const result = parseEfficiency(htmlWithHeaderInBody, 2025);
    expect(result).toHaveLength(1);
    expect(result[0].Team).toBe('Duke');
  });
});

// ============================================================================
// FOUR FACTORS PARSER TESTS
// ============================================================================

describe('parseFourFactors', () => {
  const sampleHtml = `
    <table>
      <thead>
        <tr><th>Team</th><th>Conference</th><th>AdjTempo</th><th>AdjTempo Rank</th><th>AdjOE</th><th>AdjOE Rank</th><th>Off-eFG%</th><th>Off-eFG% Rank</th><th>Off-TO%</th><th>Off-TO% Rank</th><th>Off-OR%</th><th>Off-OR% Rank</th><th>Off-FTRate</th><th>Off-FTRate Rank</th><th>AdjDE</th><th>AdjDE Rank</th><th>Def-eFG%</th><th>Def-eFG% Rank</th><th>Def-TO%</th><th>Def-TO% Rank</th><th>Def-OR%</th><th>Def-OR% Rank</th><th>Def-FTRate</th><th>Def-FTRate Rank</th></tr>
      </thead>
      <tbody>
        <tr><td>Duke</td><td>ACC</td><td>68.5</td><td>120</td><td>120.1</td><td>1</td><td>55.2</td><td>5</td><td>15.3</td><td>20</td><td>32.1</td><td>15</td><td>35.5</td><td>25</td><td>87.6</td><td>1</td><td>45.2</td><td>3</td><td>18.5</td><td>10</td><td>25.3</td><td>8</td><td>28.5</td><td>12</td></tr>
      </tbody>
    </table>
  `;

  it('should parse four factors table with 24 columns', () => {
    const result = parseFourFactors(sampleHtml);

    expect(result).toHaveLength(1);
    expect(result[0].Team).toBe('Duke');
    expect(result[0].Conference).toBe('ACC');
    expect(result[0].AdjTempo).toBe('68.5');
    expect(result[0]['Off-eFG%']).toBe('55.2');
    expect(result[0]['Def-FTRate']).toBe('28.5');
  });

  it('should strip seed from team name', () => {
    const htmlWithSeed = sampleHtml.replace('Duke', 'Duke 1');
    const result = parseFourFactors(htmlWithSeed);
    expect(result[0].Team).toBe('Duke');
  });
});

// ============================================================================
// TEAM STATS PARSER TESTS
// ============================================================================

describe('parseTeamStats', () => {
  const offenseHtml = `
    <table>
      <thead>
        <tr><th>Team</th><th>Conference</th><th>3P%</th><th>3P% Rank</th><th>2P%</th><th>2P% Rank</th><th>FT%</th><th>FT% Rank</th><th>Blk%</th><th>Blk% Rank</th><th>Stl%</th><th>Stl% Rank</th><th>NST%</th><th>NST% Rank</th><th>A%</th><th>A% Rank</th><th>3PA%</th><th>3PA% Rank</th><th>AdjOE</th><th>AdjOE Rank</th></tr>
      </thead>
      <tbody>
        <tr><td>Duke</td><td>ACC</td><td>38.5</td><td>10</td><td>55.2</td><td>5</td><td>75.5</td><td>25</td><td>8.5</td><td>50</td><td>10.2</td><td>35</td><td>15.3</td><td>40</td><td>58.5</td><td>8</td><td>35.2</td><td>100</td><td>120.1</td><td>1</td></tr>
      </tbody>
    </table>
  `;

  const defenseHtml = `
    <table>
      <thead>
        <tr><th>Team</th><th>Conference</th><th>3P%</th><th>3P% Rank</th><th>2P%</th><th>2P% Rank</th><th>FT%</th><th>FT% Rank</th><th>Blk%</th><th>Blk% Rank</th><th>Stl%</th><th>Stl% Rank</th><th>NST%</th><th>NST% Rank</th><th>A%</th><th>A% Rank</th><th>3PA%</th><th>3PA% Rank</th><th>AdjDE</th><th>AdjDE Rank</th></tr>
      </thead>
      <tbody>
        <tr><td>Duke</td><td>ACC</td><td>30.5</td><td>5</td><td>45.2</td><td>3</td><td>68.5</td><td>50</td><td>12.5</td><td>10</td><td>8.2</td><td>15</td><td>12.3</td><td>20</td><td>48.5</td><td>25</td><td>32.2</td><td>80</td><td>87.6</td><td>1</td></tr>
      </tbody>
    </table>
  `;

  it('should parse offensive team stats', () => {
    const result = parseTeamStats(offenseHtml, false);

    expect(result).toHaveLength(1);
    expect(result[0].Team).toBe('Duke');
    expect(result[0].AdjOE).toBe('120.1');
    expect(result[0]['AdjOE.Rank']).toBe('1');
  });

  it('should parse defensive team stats', () => {
    const result = parseTeamStats(defenseHtml, true);

    expect(result).toHaveLength(1);
    expect(result[0].Team).toBe('Duke');
    expect(result[0].AdjDE).toBe('87.6');
    expect(result[0]['AdjDE.Rank']).toBe('1');
  });
});

// ============================================================================
// POINT DISTRIBUTION PARSER TESTS
// ============================================================================

describe('parsePointDist', () => {
  const sampleHtml = `
    <table>
      <thead>
        <tr><th>Team</th><th>Conference</th><th>Off-FT</th><th>Off-FT Rank</th><th>Off-2P</th><th>Off-2P Rank</th><th>Off-3P</th><th>Off-3P Rank</th><th>Def-FT</th><th>Def-FT Rank</th><th>Def-2P</th><th>Def-2P Rank</th><th>Def-3P</th><th>Def-3P Rank</th></tr>
      </thead>
      <tbody>
        <tr><td>Duke</td><td>ACC</td><td>20.5</td><td>50</td><td>45.2</td><td>25</td><td>34.3</td><td>30</td><td>18.5</td><td>40</td><td>48.2</td><td>60</td><td>33.3</td><td>35</td></tr>
      </tbody>
    </table>
  `;

  it('should parse point distribution table', () => {
    const result = parsePointDist(sampleHtml);

    expect(result).toHaveLength(1);
    expect(result[0].Team).toBe('Duke');
    expect(result[0]['Off-FT']).toBe('20.5');
    expect(result[0]['Off-3P']).toBe('34.3');
    expect(result[0]['Def-2P']).toBe('48.2');
  });
});

// ============================================================================
// HEIGHT PARSER TESTS
// ============================================================================

describe('parseHeight', () => {
  const post2008Html = `
    <table>
      <thead>
        <tr><th>Team</th><th>Conference</th><th>AvgHgt</th><th>AvgHgt Rank</th><th>EffHgt</th><th>EffHgt Rank</th><th>C-Hgt</th><th>C-Hgt Rank</th><th>PF-Hgt</th><th>PF-Hgt Rank</th><th>SF-Hgt</th><th>SF-Hgt Rank</th><th>SG-Hgt</th><th>SG-Hgt Rank</th><th>PG-Hgt</th><th>PG-Hgt Rank</th><th>Experience</th><th>Experience Rank</th><th>Bench</th><th>Bench Rank</th><th>Continuity</th><th>Continuity Rank</th></tr>
      </thead>
      <tbody>
        <tr><td>Duke</td><td>ACC</td><td>76.5</td><td>25</td><td>77.2</td><td>20</td><td>82.5</td><td>15</td><td>80.2</td><td>30</td><td>78.5</td><td>35</td><td>75.2</td><td>50</td><td>73.5</td><td>45</td><td>2.5</td><td>100</td><td>25.5</td><td>75</td><td>45.2</td><td>60</td></tr>
      </tbody>
    </table>
  `;

  const pre2008Html = `
    <table>
      <thead>
        <tr><th>Team</th><th>Conference</th><th>AvgHgt</th><th>AvgHgt Rank</th><th>EffHgt</th><th>EffHgt Rank</th><th>C-Hgt</th><th>C-Hgt Rank</th><th>PF-Hgt</th><th>PF-Hgt Rank</th><th>SF-Hgt</th><th>SF-Hgt Rank</th><th>SG-Hgt</th><th>SG-Hgt Rank</th><th>PG-Hgt</th><th>PG-Hgt Rank</th><th>Experience</th><th>Experience Rank</th><th>Bench</th><th>Bench Rank</th></tr>
      </thead>
      <tbody>
        <tr><td>Duke</td><td>ACC</td><td>76.5</td><td>25</td><td>77.2</td><td>20</td><td>82.5</td><td>15</td><td>80.2</td><td>30</td><td>78.5</td><td>35</td><td>75.2</td><td>50</td><td>73.5</td><td>45</td><td>2.5</td><td>100</td><td>25.5</td><td>75</td></tr>
      </tbody>
    </table>
  `;

  it('should parse 2008+ height table with 22 columns (includes Continuity)', () => {
    const result = parseHeight(post2008Html, 2025);

    expect(result).toHaveLength(1);
    expect(result[0].Team).toBe('Duke');
    expect(result[0].Continuity).toBe('45.2');
    expect(result[0]['Continuity.Rank']).toBe('60');
  });

  it('should parse pre-2008 height table with 20 columns (no Continuity)', () => {
    const result = parseHeight(pre2008Html, 2007);

    expect(result).toHaveLength(1);
    expect(result[0].Team).toBe('Duke');
    expect(result[0].Continuity).toBeUndefined();
  });
});

// ============================================================================
// PLAYER STATS PARSER TESTS
// ============================================================================

describe('parsePlayerStats', () => {
  const eFGHtml = `
    <table>
      <thead>
        <tr><th>Rank</th><th>Player</th><th>Team</th><th>eFG</th><th>Ht</th><th>Wt</th><th>Yr</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>John Smith</td><td>Duke</td><td>65.5</td><td>6-5</td><td>195</td><td>Jr</td></tr>
        <tr><td>2</td><td>Mike Johnson</td><td>Kansas</td><td>64.2</td><td>6-8</td><td>220</td><td>Sr</td></tr>
      </tbody>
    </table>
  `;

  const fgMetricHtml = `
    <table>
      <thead>
        <tr><th>Rank</th><th>Player</th><th>Team</th><th>3PM</th><th>3PA</th><th>3P%</th><th>Ht</th><th>Wt</th><th>Yr</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>John Smith</td><td>Duke</td><td>85</td><td>200</td><td>42.5</td><td>6-5</td><td>195</td><td>Jr</td></tr>
      </tbody>
    </table>
  `;

  const ortgHtml = `
    <table>
      <thead>
        <tr><th>Rank</th><th>Player</th><th>Team</th><th>ORtg</th><th>Ht</th><th>Wt</th><th>Yr</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>John Smith</td><td>Duke</td><td>125.5 (28.5%)</td><td>6-5</td><td>195</td><td>Jr</td></tr>
      </tbody>
    </table>
  `;

  it('should parse eFG player stats', () => {
    const result = parsePlayerStats(eFGHtml, 'eFG');

    expect(result).toHaveLength(2);
    expect(result[0].Rank).toBe('1');
    expect(result[0].Player).toBe('John Smith');
    expect(result[0].Team).toBe('Duke');
    expect(result[0].eFG).toBe('65.5');
    expect(result[0].Ht).toBe('6-5');
  });

  it('should parse FG metric with Made/Attempted/Pct columns', () => {
    const result = parsePlayerStats(fgMetricHtml, '3P');

    expect(result).toHaveLength(1);
    expect(result[0]['3PM']).toBe('85');
    expect(result[0]['3PA']).toBe('200');
    expect(result[0]['3P%']).toBe('42.5');
  });

  it('should parse ORtg metric and extract Poss%', () => {
    const result = parsePlayerStats(ortgHtml, 'ORtg');

    expect(result).toHaveLength(1);
    expect(result[0].ORtg).toBe('125.5');
    expect(result[0]['Poss%']).toBe('28.5%');
  });

  it('should filter header rows and empty ranks', () => {
    const htmlWithHeaderRow = `
      <table>
        <thead><tr><th>Rank</th><th>Player</th><th>Team</th><th>eFG</th><th>Ht</th><th>Wt</th><th>Yr</th></tr></thead>
        <tbody>
          <tr><td>Rank</td><td>Player</td><td>Team</td><td>eFG</td><td>Ht</td><td>Wt</td><td>Yr</td></tr>
          <tr><td></td><td>Empty Row</td><td>Test</td><td>50</td><td>6-0</td><td>180</td><td>Fr</td></tr>
          <tr><td>1</td><td>Real Player</td><td>Duke</td><td>65.5</td><td>6-5</td><td>195</td><td>Jr</td></tr>
        </tbody>
      </table>
    `;
    const result = parsePlayerStats(htmlWithHeaderRow, 'eFG');

    expect(result).toHaveLength(1);
    expect(result[0].Player).toBe('Real Player');
  });
});

// ============================================================================
// KPOY PARSER TESTS
// ============================================================================

describe('parseKpoy', () => {
  const sampleHtml = `
    <table>
      <thead><tr><th>Rank</th><th>Player Info</th><th>Rating</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>John Smith, Duke 6-5 · 195, Jr, Durham, NC</td><td>98.5</td></tr>
        <tr><td>2</td><td>Mike Johnson, Kansas 6-8 · 220, Sr, Lawrence, KS</td><td>97.2</td></tr>
      </tbody>
    </table>
    <table>
      <thead><tr><th>Rank</th><th>Player Info</th><th>Rating</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>MVP Player, Houston 6-6 · 205, Jr, Houston, TX</td><td>99.0</td></tr>
      </tbody>
    </table>
  `;

  it('should parse KPOY table', () => {
    const result = parseKpoy(sampleHtml, 2025);

    expect(result.kpoy).toHaveLength(2);
    expect(result.kpoy[0].Rank).toBe('1');
    expect(result.kpoy[0].Player).toBe('John Smith');
    expect(result.kpoy[0].Team).toBe('Duke');
    expect(result.kpoy[0]['KPOY Rating']).toBe('98.5');
  });

  it('should parse MVP table for 2013+ seasons', () => {
    const result = parseKpoy(sampleHtml, 2025);

    expect(result.mvp).not.toBeNull();
    expect(result.mvp).toHaveLength(1);
    expect(result.mvp[0].Player).toBe('MVP Player');
  });

  it('should return null MVP for pre-2013 seasons', () => {
    const result = parseKpoy(sampleHtml, 2012);

    expect(result.mvp).toBeNull();
  });
});

// ============================================================================
// REFS PARSER TESTS
// ============================================================================

describe('parseRefs', () => {
  const sampleHtml = `
    <table>
      <thead>
        <tr><th>Rank</th><th>Name</th><th>Rating</th><th>Games</th><th>Last Game</th><th>Game Score</th><th>Box</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>John Higgins</td><td>98.5</td><td>45</td><td>Mar 15</td><td>95.2</td><td>box</td></tr>
        <tr><td>2</td><td>Gene Steratore</td><td>97.2</td><td>42</td><td>Mar 14</td><td>92.5</td><td>box</td></tr>
      </tbody>
    </table>
  `;

  it('should parse referee table', () => {
    const result = parseRefs(sampleHtml);

    expect(result).toHaveLength(2);
    expect(result[0].Rank).toBe('1');
    expect(result[0].Name).toBe('John Higgins');
    expect(result[0].Rating).toBe('98.5');
    expect(result[0].Games).toBe('45');
  });

  it('should remove Box column from output', () => {
    const result = parseRefs(sampleHtml);

    expect(result[0].Box).toBeUndefined();
  });
});

// ============================================================================
// HCA PARSER TESTS
// ============================================================================

describe('parseHca', () => {
  const sampleHtml = `
    <table>
      <thead>
        <tr><th>Team</th><th>Conference</th><th>HCA</th><th>HCA Rank</th><th>PF</th><th>PF Rank</th><th>Pts</th><th>Pts Rank</th><th>NST</th><th>NST Rank</th><th>Blk</th><th>Blk Rank</th><th>Elev</th><th>Elev Rank</th></tr>
      </thead>
      <tbody>
        <tr><td>Duke</td><td>ACC</td><td>3.5</td><td>25</td><td>2.1</td><td>30</td><td>4.5</td><td>15</td><td>1.2</td><td>50</td><td>0.8</td><td>40</td><td>310</td><td>175</td></tr>
      </tbody>
    </table>
  `;

  it('should parse HCA table', () => {
    const result = parseHca(sampleHtml);

    expect(result).toHaveLength(1);
    expect(result[0].Team).toBe('Duke');
    expect(result[0].HCA).toBe('3.5');
    expect(result[0]['HCA.Rank']).toBe('25');
    expect(result[0].Elev).toBe('310');
  });
});

// ============================================================================
// ARENAS PARSER TESTS
// ============================================================================

describe('parseArenas', () => {
  const sampleHtml = `
    <table>
      <thead>
        <tr><th>Rank</th><th>Team</th><th>Conference</th><th>Arena</th><th>Alternate</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>Duke</td><td>ACC</td><td>Cameron Indoor Stadium (9314)</td><td>PNC Arena (19722)</td></tr>
        <tr><td>2</td><td>Kansas</td><td>B12</td><td>Allen Fieldhouse (16300)</td><td></td></tr>
      </tbody>
    </table>
  `;

  it('should parse arenas table and extract capacity', () => {
    const result = parseArenas(sampleHtml);

    expect(result).toHaveLength(2);
    expect(result[0].Arena).toBe('Cameron Indoor Stadium');
    expect(result[0]['Arena.Capacity']).toBe('9314');
    expect(result[0].Alternate).toBe('PNC Arena');
    expect(result[0]['Alternate.Capacity']).toBe('19722');
  });

  it('should handle empty alternate arena', () => {
    const result = parseArenas(sampleHtml);

    expect(result[1].Alternate).toBe('');
    expect(result[1]['Alternate.Capacity']).toBe('');
  });
});

// ============================================================================
// GAME ATTRIBS PARSER TESTS
// ============================================================================

describe('parseGameAttribs', () => {
  const sampleHtml = `
    <table>
      <thead>
        <tr><th>Rank</th><th>Date</th><th>Game</th><th>Box</th><th>Location</th><th>Conf.Matchup</th><th>Value</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>Mar 15</td><td>Duke vs UNC</td><td>box</td><td>Durham (Cameron Indoor)</td><td>ACC vs ACC</td><td>98.5</td></tr>
      </tbody>
    </table>
  `;

  it('should parse game attributes and extract arena', () => {
    const result = parseGameAttribs(sampleHtml);

    expect(result).toHaveLength(1);
    expect(result[0].Location).toBe('Durham');
    expect(result[0].Arena).toBe('Cameron Indoor');
  });

  it('should remove Box column', () => {
    const result = parseGameAttribs(sampleHtml);
    expect(result[0].Box).toBeUndefined();
  });
});

// ============================================================================
// PROGRAM RATINGS PARSER TESTS
// ============================================================================

describe('parseProgramRatings', () => {
  const sampleHtml = `
    <table>
      <thead>
        <tr><th>Rank</th><th>Team</th><th>Conference</th><th>Rating</th><th>kenpom Best Rank</th><th>kenpom Best Season</th><th>kenpom Worst Rank</th><th>kenpom Worst Season</th><th>kenpom Median Rank</th><th>kenpom Top10 Finishes</th><th>kenpom Top25 Finishes</th><th>kenpom Top50 Finishes</th><th>NCAA Champs</th><th>NCAA F4</th><th>NCAA S16</th><th>NCAA R1</th><th>Change</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>Duke</td><td>ACC</td><td>98.5</td><td>1</td><td>2001</td><td>25</td><td>2005</td><td>8</td><td>15</td><td>20</td><td>22</td><td>5</td><td>15</td><td>25</td><td>30</td><td>+2</td></tr>
      </tbody>
    </table>
  `;

  it('should parse program ratings table', () => {
    const result = parseProgramRatings(sampleHtml);

    expect(result).toHaveLength(1);
    expect(result[0].Rank).toBe('1');
    expect(result[0].Team).toBe('Duke');
    expect(result[0].Rating).toBe('98.5');
    expect(result[0]['kenpom.Best.Rank']).toBe('1');
    expect(result[0]['NCAA.Champs']).toBe('5');
  });
});

// ============================================================================
// TRENDS PARSER TESTS
// ============================================================================

describe('parseTrends', () => {
  const sampleHtml = `
    <table>
      <thead>
        <tr><th>Season</th><th>Tempo</th><th>eFG</th><th>TO%</th><th>OR%</th></tr>
      </thead>
      <tbody>
        <tr><td>2025</td><td>68.5</td><td>52.3</td><td>17.5</td><td>27.2</td></tr>
        <tr><td>2024</td><td>67.8</td><td>51.9</td><td>18.2</td><td>26.8</td></tr>
        <tr><td>2023</td><td>67.2</td><td>51.5</td><td>18.8</td><td>26.5</td></tr>
        <tr><td>2022</td><td>66.8</td><td>51.1</td><td>19.1</td><td>26.2</td></tr>
        <tr><td>2021</td><td>66.2</td><td>50.8</td><td>19.5</td><td>25.9</td></tr>
        <tr><td>2020</td><td>65.8</td><td>50.5</td><td>19.8</td><td>25.6</td></tr>
        <tr><td>2019</td><td>65.5</td><td>50.2</td><td>20.1</td><td>25.3</td></tr>
        <tr><td>summary1</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
        <tr><td>summary2</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
        <tr><td>summary3</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
        <tr><td>summary4</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
        <tr><td>summary5</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
      </tbody>
    </table>
  `;

  it('should parse trends table and drop last 5 rows', () => {
    const result = parseTrends(sampleHtml);

    expect(result).toHaveLength(7); // 12 - 5 = 7
    expect(result[0].Season).toBe('2025');
    expect(result[result.length - 1].Season).toBe('2019');
  });
});

// ============================================================================
// SCHEDULE PARSER TESTS
// ============================================================================

describe('parseSchedule', () => {
  const post2010Html = `
    <table></table>
    <table>
      <thead>
        <tr><th>Date</th><th>Team Rank</th><th>Opponent Rank</th><th>Opponent Name</th><th>Result</th><th>Possession Number</th><th>A</th><th>Location</th><th>Record</th><th>Conference</th><th>B</th></tr>
      </thead>
      <tbody>
        <tr><td>Nov 6</td><td>1</td><td>150</td><td>Maine</td><td>W 85-52</td><td>75</td><td>-</td><td>H</td><td>1-0</td><td>0-0</td><td>-</td></tr>
        <tr><td colspan="11">ACC Tournament</td></tr>
        <tr><td>Mar 12</td><td>2</td><td>25</td><td>Virginia</td><td>W 72-65</td><td>68</td><td>-</td><td>N</td><td>25-5</td><td>15-4</td><td>-</td></tr>
      </tbody>
    </table>
  `;

  const pre2010Html = `
    <table></table>
    <table>
      <thead>
        <tr><th>Date</th><th>Opponent Rank</th><th>Opponent Name</th><th>Result</th><th>Possession Number</th><th>A</th><th>Location</th><th>Record</th><th>Conference</th><th>B</th></tr>
      </thead>
      <tbody>
        <tr><td>Nov 6</td><td>150</td><td>Maine</td><td>W 85-52</td><td>75</td><td>-</td><td>H</td><td>1-0</td><td>0-0</td><td>-</td></tr>
      </tbody>
    </table>
  `;

  it('should parse 2010+ schedule with Team Rank column', () => {
    const result = parseSchedule(post2010Html, 2025);

    expect(result).toHaveLength(2);
    expect(result[0]['Team Rank']).toBe('1');
    expect(result[0]['Opponent Rank']).toBe('150');
    expect(result[0]['Opponent Name']).toBe('Maine');
    expect(result[0].Result).toBe('W 85-52');
  });

  it('should parse pre-2010 schedule without Team Rank column', () => {
    const result = parseSchedule(pre2010Html, 2009);

    expect(result).toHaveLength(1);
    expect(result[0]['Team Rank']).toBe('');
    expect(result[0]['Opponent Rank']).toBe('150');
  });

  it('should track tournament headers', () => {
    const result = parseSchedule(post2010Html, 2025);

    expect(result[0].Tournament).toBe('');
    expect(result[1].Tournament).toBe('Tournament');
  });

  it('should remove A and B columns', () => {
    const result = parseSchedule(post2010Html, 2025);

    expect(result[0].A).toBeUndefined();
    expect(result[0].B).toBeUndefined();
  });

  it('should throw error if less than 2 tables', () => {
    expect(() => parseSchedule('<table></table>', 2025)).toThrow('Schedule table not found');
  });
});

// ============================================================================
// FANMATCH PARSER TESTS
// ============================================================================

describe('parseFanMatch', () => {
  const sampleHtml = `
    <table>
      <thead>
        <tr><th>Game</th><th>Prediction</th><th>Thrill Score</th><th>Come back</th><th>Excite ment</th></tr>
      </thead>
      <tbody>
        <tr><td>1 Duke 85, 25 UNC 78</td><td>Duke 82-75 (75%) [68]</td><td>95.5</td><td>85.2</td><td>90.1</td></tr>
        <tr><td>10 Kansas at 15 Kentucky</td><td>Kansas 78-72 (62%) [70]</td><td>88.2</td><td>78.5</td><td>82.3</td></tr>
      </tbody>
    </table>
  `;

  const noGamesHtml = '<div>Sorry, no games today</div>';

  it('should parse FanMatch completed games', () => {
    const result = parseFanMatch(sampleHtml);

    expect(result.games).toHaveLength(2);
    expect(result.games[0].Winner).toBe('Duke');
    expect(result.games[0].WinnerScore).toBe('85');
    expect(result.games[0].Loser).toBe('UNC');
    expect(result.games[0].LoserScore).toBe('78');
    expect(result.games[0].ActualMOV).toBe(7);
  });

  it('should parse predictions', () => {
    const result = parseFanMatch(sampleHtml);

    expect(result.games[0].PredictedWinner).toBe('Duke');
    expect(result.games[0].PredictedScore).toBe('82-75');
    expect(result.games[0].WinProbability).toBe('75%');
    expect(result.games[0].PredictedMOV).toBe(7);
  });

  it('should parse upcoming games (not completed)', () => {
    const result = parseFanMatch(sampleHtml);

    expect(result.games[1].Winner).toBe('Kansas'); // First team in "at" format
    expect(result.games[1].Loser).toBe('Kentucky');
    expect(result.games[1].ActualMOV).toBeNull();
  });

  it('should return empty games array for no games message', () => {
    const result = parseFanMatch(noGamesHtml);

    expect(result.games).toHaveLength(0);
    expect(result.summary).toBeNull();
  });

  it('should handle empty table', () => {
    const emptyHtml = '<div>No tables here</div>';
    const result = parseFanMatch(emptyHtml);

    expect(result.games).toHaveLength(0);
  });

  it('should parse prediction without possessions (simple format)', () => {
    const htmlSimplePred = `
      <table>
        <thead>
          <tr><th>Game</th><th>Prediction</th><th>Thrill Score</th><th>Come back</th><th>Excite ment</th></tr>
        </thead>
        <tbody>
          <tr><td>1 Duke 85, 25 UNC 78</td><td>Duke 80-75 (65%)</td><td>88.5</td><td>75.2</td><td>80.1</td></tr>
        </tbody>
      </table>
    `;
    const result = parseFanMatch(htmlSimplePred);

    expect(result.games).toHaveLength(1);
    expect(result.games[0].PredictedWinner).toBe('Duke');
    expect(result.games[0].PredictedScore).toBe('80-75');
    expect(result.games[0].WinProbability).toBe('65%');
    expect(result.games[0].PredictedPossessions).toBeNull();
    expect(result.games[0].PredictedMOV).toBe(5);
  });

  it('should handle invalid/missing prediction format', () => {
    const htmlNoPred = `
      <table>
        <thead>
          <tr><th>Game</th><th>Prediction</th><th>Thrill Score</th><th>Come back</th><th>Excite ment</th></tr>
        </thead>
        <tbody>
          <tr><td>1 Duke 85, 25 UNC 78</td><td>TBD</td><td>88.5</td><td>75.2</td><td>80.1</td></tr>
        </tbody>
      </table>
    `;
    const result = parseFanMatch(htmlNoPred);

    expect(result.games).toHaveLength(1);
    expect(result.games[0].PredictedWinner).toBeNull();
    expect(result.games[0].PredictedScore).toBeNull();
    expect(result.games[0].WinProbability).toBeNull();
    expect(result.games[0].PredictedPossessions).toBeNull();
    expect(result.games[0].PredictedMOV).toBeNull();
  });

  it('should use predicted possessions when actual not available', () => {
    // Upcoming game doesn't have actual possessions
    const result = parseFanMatch(`
      <table>
        <thead>
          <tr><th>Game</th><th>Prediction</th><th>Thrill Score</th><th>Come back</th><th>Excite ment</th></tr>
        </thead>
        <tbody>
          <tr><td>10 Kansas at 15 Kentucky</td><td>Kansas 78-72 (62%) [70]</td><td>88.2</td><td>78.5</td><td>82.3</td></tr>
        </tbody>
      </table>
    `);

    expect(result.games).toHaveLength(1);
    expect(result.games[0].PredictedPossessions).toBe(70);
    expect(result.games[0].Possessions).toBe('70'); // Uses predicted when actual missing
  });

  it('should extract tournament label from game string', () => {
    // Tournament is extracted from game string (e.g., "ACC-T" or "NCAA" suffix)
    const htmlWithTournament = `
      <table>
        <thead>
          <tr><th>Game</th><th>Prediction</th><th>Thrill Score</th><th>Come back</th><th>Excite ment</th></tr>
        </thead>
        <tbody>
          <tr><td>1 Duke 85, 25 UNC 78</td><td>Duke 82-75 (75%) [68]</td><td>95.5</td><td>85.2</td><td>90.1</td></tr>
          <tr><td>2 Kansas 80, 15 Kentucky 72 ACC-T</td><td>Kansas 79-70 (60%) [65]</td><td>88.5</td><td>75.2</td><td>80.1</td></tr>
          <tr><td>3 Auburn 75, 10 Tennessee 70 NCAA</td><td>Auburn 72-68 (55%)</td><td>92.0</td><td>80.0</td><td>85.0</td></tr>
        </tbody>
      </table>
    `;
    const result = parseFanMatch(htmlWithTournament);

    expect(result.games).toHaveLength(3);
    expect(result.games[0].Tournament).toBeNull();
    expect(result.games[1].Tournament).toBe('ACC-T');
    expect(result.games[2].Tournament).toBe('NCAA');
  });

  it('should extract possessions from game string', () => {
    const htmlWithPoss = `
      <table>
        <thead>
          <tr><th>Game</th><th>Prediction</th><th>Thrill Score</th><th>Come back</th><th>Excite ment</th></tr>
        </thead>
        <tbody>
          <tr><td>1 Duke 85, 25 UNC 78 [72]</td><td>Duke 82-75 (75%)</td><td>95.5</td><td>85.2</td><td>90.1</td></tr>
        </tbody>
      </table>
    `;
    const result = parseFanMatch(htmlWithPoss);

    expect(result.games).toHaveLength(1);
    expect(result.games[0].Possessions).toBe('72');
  });

  it('should parse alternate column name formats', () => {
    const htmlAltCols = `
      <table>
        <thead>
          <tr><th>Game</th><th>Prediction</th><th>ThrillScore</th><th>Comeback</th><th>Excitement</th></tr>
        </thead>
        <tbody>
          <tr><td>1 Duke 85, 25 UNC 78</td><td>Duke 82-75 (75%)</td><td>95.5·10</td><td>85.2·5</td><td>90.1·3</td></tr>
        </tbody>
      </table>
    `;
    const result = parseFanMatch(htmlAltCols);

    expect(result.games).toHaveLength(1);
    expect(result.games[0]['Thrill Score']).toBe('95.5');
    expect(result.games[0]['Come back']).toBe('85.2');
    expect(result.games[0]['Excite ment']).toBe('90.1');
  });
});

// ============================================================================
// PARSE GAME RESULT TESTS
// ============================================================================

describe('parseGameResult', () => {
  it('should parse completed game with scores', () => {
    const result = parseGameResult('233 Rice 77, 273 FIU 70');

    expect(result.isCompleted).toBe(true);
    expect(result.Winner).toBe('Rice');
    expect(result.WinnerRank).toBe('233');
    expect(result.WinnerScore).toBe('77');
    expect(result.Loser).toBe('FIU');
    expect(result.LoserRank).toBe('273');
    expect(result.LoserScore).toBe('70');
    expect(result.ActualMOV).toBe(7);
  });

  it('should parse game with overtime', () => {
    const result = parseGameResult('1 Duke 80, 5 UNC 78 (OT)');

    expect(result.OT).toBe('OT');
    expect(result.Winner).toBe('Duke');
    expect(result.ActualMOV).toBe(2);
  });

  it('should parse double overtime', () => {
    const result = parseGameResult('1 Duke 90, 5 UNC 85 (2OT)');

    expect(result.OT).toBe('2OT');
  });

  it('should parse away game format', () => {
    const result = parseGameResult('10 Duke at 15 UNC');

    expect(result.isAway).toBe(true);
    expect(result.Winner).toBe('Duke');
    expect(result.WinnerRank).toBe('10');
    expect(result.Loser).toBe('UNC');
    expect(result.LoserRank).toBe('15');
    expect(result.WinnerScore).toBeNull();
    expect(result.LoserScore).toBeNull();
  });

  it('should parse neutral game format', () => {
    const result = parseGameResult('10 Duke vs. 15 UNC');

    expect(result.isNeutral).toBe(true);
    expect(result.Winner).toBe('Duke');
    expect(result.Loser).toBe('UNC');
  });

  it('should handle multi-word team names', () => {
    const result = parseGameResult('1 North Carolina 75, 10 Michigan St. 70');

    expect(result.Winner).toBe('North Carolina');
    expect(result.Loser).toBe('Michigan St.');
  });

  it('should handle null input', () => {
    const result = parseGameResult(null);

    expect(result.Winner).toBeNull();
    expect(result.isCompleted).toBe(false);
  });

  it('should handle empty string', () => {
    const result = parseGameResult('');

    expect(result.Winner).toBeNull();
  });

  it('should handle unrecognized format', () => {
    const result = parseGameResult('some random text');

    expect(result.Winner).toBeNull();
    expect(result.isCompleted).toBe(false);
  });
});

// ============================================================================
// VALID TEAMS PARSER TESTS
// ============================================================================

describe('parseValidTeams', () => {
  const sampleHtml = `
    <html>
      <body>
        <a href="team.php?team=Duke">Duke 1</a>
        <a href="team.php?team=Kansas">Kansas</a>
        <a href="team.php?team=North+Carolina">North Carolina 2</a>
        <a href="other.php?x=1">Not a team</a>
        <a href="team.php?team=Team">Team</a>
      </body>
    </html>
  `;

  it('should extract team names from team.php links', () => {
    const result = parseValidTeams(sampleHtml);

    expect(result).toContain('Duke');
    expect(result).toContain('Kansas');
    expect(result).toContain('North Carolina');
  });

  it('should strip seeds from team names', () => {
    const result = parseValidTeams(sampleHtml);

    expect(result).not.toContain('Duke 1');
    expect(result).not.toContain('North Carolina 2');
  });

  it('should exclude "Team" text', () => {
    const result = parseValidTeams(sampleHtml);

    expect(result).not.toContain('Team');
  });

  it('should not include duplicates', () => {
    const htmlWithDupes = `
      <a href="team.php?team=Duke">Duke</a>
      <a href="team.php?team=Duke">Duke</a>
    `;
    const result = parseValidTeams(htmlWithDupes);

    expect(result.filter(t => t === 'Duke')).toHaveLength(1);
  });
});

// ============================================================================
// SCOUTING REPORT PARSER TESTS
// ============================================================================

describe('parseScoutingReport', () => {
  // The parseScoutingReport function uses complex regex patterns designed for
  // real KenPom HTML which has specific inline JavaScript formatting.
  // These tests verify the default behavior and structure.

  it('should return default stats structure when no script found', () => {
    const result = parseScoutingReport('<html></html>', false);

    // Verify structure has expected keys
    expect(result).toHaveProperty('OE');
    expect(result).toHaveProperty('OE.Rank');
    expect(result).toHaveProperty('DE');
    expect(result).toHaveProperty('DE.Rank');
    expect(result).toHaveProperty('Tempo');
    expect(result).toHaveProperty('eFG');
    expect(result).toHaveProperty('TOPct');
    expect(result).toHaveProperty('ORPct');
    expect(result).toHaveProperty('FTR');

    // All values should be empty strings by default
    expect(result.OE).toBe('');
    expect(result['OE.Rank']).toBe('');
  });

  it('should return default stats when script has no tableStart function', () => {
    const html = '<html><script type="text/javascript">var x = 1;</script></html>';
    const result = parseScoutingReport(html, false);

    expect(result.OE).toBe('');
    expect(result.DE).toBe('');
  });

  it('should return default stats for conferenceOnly when checkbox handler not found', () => {
    const html = '<html><script type="text/javascript">function other() {}</script></html>';
    const result = parseScoutingReport(html, true);

    expect(result.OE).toBe('');
    expect(result.DE).toBe('');
  });

  it('should have all expected stat keys in default structure', () => {
    const result = parseScoutingReport('<html></html>', false);

    // Check a sampling of expected keys
    const expectedKeys = [
      'OE', 'OE.Rank', 'DE', 'DE.Rank', 'Tempo', 'Tempo.Rank',
      'eFG', 'eFG.Rank', 'DeFG', 'DeFG.Rank',
      'TOPct', 'TOPct.Rank', 'DTOPct', 'DTOPct.Rank',
      'ORPct', 'ORPct.Rank', 'DORPct', 'DORPct.Rank',
      'FTR', 'FTR.Rank', 'DFTR', 'DFTR.Rank',
      '3Pct', '3Pct.Rank', '2Pct', '2Pct.Rank'
    ];

    for (const key of expectedKeys) {
      expect(result).toHaveProperty(key);
    }
  });

  it('should return defaults when script has no src but function not found', () => {
    // Tests the branch where script exists without src but function pattern not matched
    const html = '<html><script type="text/javascript">var other = 1;</script></html>';
    const result = parseScoutingReport(html, false);

    expect(result.OE).toBe('');
    expect(result['OE.Rank']).toBe('');
  });

  // Note: The parseScoutingReport function uses highly specific regex patterns
  // designed for actual KenPom HTML structure. The patterns like
  // /function tableStart\(\) \{([^}]+)\}/ expect a specific inline JavaScript format
  // that's difficult to replicate in test fixtures. Integration tests with real
  // KenPom data would cover these code paths, but unit tests are limited to
  // verifying the default structure and edge case handling.
});

// ============================================================================
// CONFERENCE PARSERS TESTS
// ============================================================================

describe('parseConferenceStandings', () => {
  const sampleHtml = `
    <table>
      <thead>
        <tr><th>Team</th><th>Conf W-L</th><th>Overall W-L</th><th>AdjEM</th><th>AdjEM</th></tr>
      </thead>
      <tbody>
        <tr><td>Duke 1</td><td>15-4</td><td>28-5</td><td>+32.5</td><td>1</td></tr>
        <tr><td>UNC</td><td>14-5</td><td>26-7</td><td>+28.2</td><td>3</td></tr>
      </tbody>
    </table>
  `;

  it('should parse conference standings', () => {
    const result = parseConferenceStandings(sampleHtml);

    expect(result).toHaveLength(2);
    expect(result[0].Team).toBe('Duke');
    expect(result[0].Seed).toBe('1');
    expect(result[0]['Conf W-L']).toBe('15-4');
  });

  it('should add .Rank suffix to duplicate headers', () => {
    const result = parseConferenceStandings(sampleHtml);

    expect(result[0].AdjEM).toBe('+32.5');
    expect(result[0]['AdjEM.Rank']).toBe('1');
  });
});

describe('parseConferenceOffense', () => {
  const sampleHtml = `
    <table></table>
    <table>
      <thead>
        <tr><th>Team</th><th>AdjOE</th><th>AdjOE</th></tr>
      </thead>
      <tbody>
        <tr><td>Duke</td><td>120.5</td><td>1</td></tr>
      </tbody>
    </table>
    <table></table>
  `;

  it('should parse second table for offense stats', () => {
    const result = parseConferenceOffense(sampleHtml);

    expect(result).toHaveLength(1);
    expect(result[0].Team).toBe('Duke');
    expect(result[0].AdjOE).toBe('120.5');
  });
});

describe('parseConferenceDefense', () => {
  const sampleHtml = `
    <table></table>
    <table></table>
    <table>
      <thead>
        <tr><th>Team</th><th>AdjDE</th><th>AdjDE</th></tr>
      </thead>
      <tbody>
        <tr><td>Duke</td><td>87.3</td><td>1</td></tr>
      </tbody>
    </table>
  `;

  it('should parse third table for defense stats', () => {
    const result = parseConferenceDefense(sampleHtml);

    expect(result).toHaveLength(1);
    expect(result[0].Team).toBe('Duke');
    expect(result[0].AdjDE).toBe('87.3');
  });
});

describe('parseConferenceAggregateStats', () => {
  const allConferencesHtml = `
    <table>
      <thead>
        <tr><th>Conference</th><th>AdjEM</th><th>AdjEM</th></tr>
      </thead>
      <tbody>
        <tr><td>ACC</td><td>+15.5</td><td>1</td></tr>
        <tr><td>SEC</td><td>+14.2</td><td>2</td></tr>
      </tbody>
    </table>
  `;

  const singleConferenceHtml = `
    <table></table>
    <table></table>
    <table></table>
    <table>
      <thead><tr><th>Stat</th><th>Value</th><th>Rank</th></tr></thead>
      <tbody>
        <tr><td>Tempo (Adjusted)</td><td>68.5</td><td>5</td></tr>
        <tr><td>AdjOE</td><td>120.5</td><td>1</td></tr>
      </tbody>
    </table>
    <table>
      <thead><tr><th>Stat</th><th>Value</th><th>Rank</th></tr></thead>
      <tbody>
        <tr><td>eFG%</td><td>52.3</td><td>10</td></tr>
      </tbody>
    </table>
    <table></table>
  `;

  it('should parse all conferences stats from first table (singleConf=false)', () => {
    const result = parseConferenceAggregateStats(allConferencesHtml, false);

    expect(result).toHaveLength(2);
    expect(result[0].Conference).toBe('ACC');
    expect(result[0].AdjEM).toBe('+15.5');
  });

  it('should parse single conference stats from -3 and -2 tables (singleConf=true)', () => {
    const result = parseConferenceAggregateStats(singleConferenceHtml, true);

    expect(result.length).toBeGreaterThan(0);
    // Verify stat name has parenthetical stripped
    expect(result.some(r => r.Stat === 'Tempo')).toBe(true);
    expect(result.some(r => r.Stat === 'AdjOE')).toBe(true);
  });

  it('should handle empty tables', () => {
    const emptyHtml = '<table></table>';
    // This may throw or return empty - just verify it doesn't crash unexpectedly
    expect(() => parseConferenceAggregateStats(emptyHtml, false)).not.toThrow();
  });
});
