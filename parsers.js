/**
 * KenPom Specialized Parsers
 *
 * Parsing functions that match kenpompy's output format for each endpoint.
 * Each parser handles column naming, data cleaning, and post-processing
 * specific to that endpoint.
 */

import * as cheerio from 'cheerio';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Strip tournament seed numbers from team name.
 * @param {string} team - Team name possibly containing seed
 * @returns {string} Clean team name
 */
export function stripSeed(team) {
  if (!team) return team;
  return team.replace(/\d+/g, '').trim();
}

/**
 * Extract seed from team name.
 * @param {string} team - Team name possibly containing seed
 * @returns {string|null} Seed number or null
 */
export function extractSeed(team) {
  if (!team) return null;
  const match = team.match(/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Parse a table from HTML using cheerio.
 * @param {string} html - HTML content
 * @param {number} tableIndex - Index of table to parse
 * @returns {{ $: CheerioAPI, table: Cheerio, rows: Array }}
 */
function getTable(html, tableIndex = 0) {
  const $ = cheerio.load(html);
  const tables = $('table');

  if (tables.length === 0) {
    throw new Error('No tables found');
  }

  if (tableIndex >= tables.length) {
    throw new Error(`Table index ${tableIndex} out of bounds. Found ${tables.length} tables.`);
  }

  return { $, table: tables.eq(tableIndex) };
}

/**
 * Extract rows from a table with given column names.
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Cheerio} table - Table element
 * @param {Array<string>} columns - Column names to use
 * @returns {Array<Object>} Parsed rows
 */
function extractRows($, table, columns) {
  const rows = [];
  const tbody = table.find('tbody');
  // If no tbody, skip first row (index 0) as it's typically the header row
  const bodyRows = tbody.length > 0 ? tbody.find('tr') : table.find('tr').slice(1);

  bodyRows.each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length === 0) return;

    const rowData = {};
    cells.each((j, cell) => {
      if (j < columns.length) {
        rowData[columns[j]] = $(cell).text().trim();
      }
    });

    if (Object.keys(rowData).length > 0) {
      rows.push(rowData);
    }
  });

  return rows;
}

// ============================================================================
// POMEROY RATINGS PARSER
// ============================================================================

/**
 * Parse Pomeroy ratings table.
 * Handles MultiIndex headers and extracts Seed from team name.
 *
 * @param {string} html - HTML content
 * @returns {Array<Object>} Parsed ratings with columns:
 *   Rk, Team, Conf, W-L, AdjEM, AdjO, AdjO.Rank, AdjD, AdjD.Rank,
 *   AdjT, AdjT.Rank, Luck, Luck.Rank, SOS-AdjEM, SOS-AdjEM.Rank,
 *   SOS-OppO, SOS-OppO.Rank, SOS-OppD, SOS-OppD.Rank,
 *   NCSOS-AdjEM, NCSOS-AdjEM.Rank, Seed
 */
export function parsePomeroyRatings(html) {
  const { $, table } = getTable(html, 0);

  // Fixed column names matching kenpompy output
  const columns = [
    'Rk', 'Team', 'Conf', 'W-L', 'AdjEM',
    'AdjO', 'AdjO.Rank', 'AdjD', 'AdjD.Rank',
    'AdjT', 'AdjT.Rank', 'Luck', 'Luck.Rank',
    'SOS-AdjEM', 'SOS-AdjEM.Rank', 'SOS-OppO', 'SOS-OppO.Rank',
    'SOS-OppD', 'SOS-OppD.Rank', 'NCSOS-AdjEM', 'NCSOS-AdjEM.Rank'
  ];

  const rows = extractRows($, table, columns);

  // Post-process: filter headers, extract seed, clean team name
  return rows
    .filter(row => row.Rk !== 'Rk' && row.Rk !== '')
    .map(row => {
      const seed = extractSeed(row.Team);
      return {
        ...row,
        Team: stripSeed(row.Team),
        Seed: seed || ''
      };
    });
}

// ============================================================================
// EFFICIENCY PARSER
// ============================================================================

/**
 * Parse efficiency/summary table.
 * Year-dependent columns: 14 pre-2010, 18 for 2010+.
 *
 * @param {string} html - HTML content
 * @param {number} season - Season year
 * @returns {Array<Object>} Parsed efficiency data
 */
export function parseEfficiency(html, season) {
  const { $, table } = getTable(html, 0);

  // Column names depend on year - KenPom added Avg.Poss.Length columns in 2010
  let columns;
  if (season && season < 2010) {
    columns = [
      'Team', 'Conference',
      'Tempo-Adj', 'Tempo-Adj.Rank', 'Tempo-Raw', 'Tempo-Raw.Rank',
      'Off.Efficiency-Adj', 'Off.Efficiency-Adj.Rank', 'Off.Efficiency-Raw', 'Off.Efficiency-Raw.Rank',
      'Def.Efficiency-Adj', 'Def.Efficiency-Adj.Rank', 'Def.Efficiency-Raw', 'Def.Efficiency-Raw.Rank'
    ];
  } else {
    columns = [
      'Team', 'Conference',
      'Tempo-Adj', 'Tempo-Adj.Rank', 'Tempo-Raw', 'Tempo-Raw.Rank',
      'Avg.Poss.Length-Off', 'Avg.Poss.Length-Off.Rank', 'Avg.Poss.Length-Def', 'Avg.Poss.Length-Def.Rank',
      'Off.Efficiency-Adj', 'Off.Efficiency-Adj.Rank', 'Off.Efficiency-Raw', 'Off.Efficiency-Raw.Rank',
      'Def.Efficiency-Adj', 'Def.Efficiency-Adj.Rank', 'Def.Efficiency-Raw', 'Def.Efficiency-Raw.Rank'
    ];
  }

  const rows = extractRows($, table, columns);

  return rows
    .filter(row => row.Team !== 'Team' && row.Team !== '')
    .map(row => ({
      ...row,
      Team: stripSeed(row.Team)
    }));
}

// ============================================================================
// FOUR FACTORS PARSER
// ============================================================================

/**
 * Parse four factors table.
 * Fixed 24 columns.
 *
 * @param {string} html - HTML content
 * @returns {Array<Object>} Parsed four factors data
 */
export function parseFourFactors(html) {
  const { $, table } = getTable(html, 0);

  const columns = [
    'Team', 'Conference', 'AdjTempo', 'AdjTempo.Rank',
    'AdjOE', 'AdjOE.Rank',
    'Off-eFG%', 'Off-eFG%.Rank', 'Off-TO%', 'Off-TO%.Rank',
    'Off-OR%', 'Off-OR%.Rank', 'Off-FTRate', 'Off-FTRate.Rank',
    'AdjDE', 'AdjDE.Rank',
    'Def-eFG%', 'Def-eFG%.Rank', 'Def-TO%', 'Def-TO%.Rank',
    'Def-OR%', 'Def-OR%.Rank', 'Def-FTRate', 'Def-FTRate.Rank'
  ];

  const rows = extractRows($, table, columns);

  return rows
    .filter(row => row.Team !== 'Team' && row.Team !== '')
    .map(row => ({
      ...row,
      Team: stripSeed(row.Team)
    }));
}

// ============================================================================
// TEAM STATS PARSER
// ============================================================================

/**
 * Parse team stats table.
 * Fixed 20 columns, last two vary based on offense/defense.
 *
 * @param {string} html - HTML content
 * @param {boolean} defense - Whether this is defensive stats
 * @returns {Array<Object>} Parsed team stats
 */
export function parseTeamStats(html, defense = false) {
  const { $, table } = getTable(html, 0);

  const lastCol = defense ? 'AdjDE' : 'AdjOE';
  const columns = [
    'Team', 'Conference',
    '3P%', '3P%.Rank', '2P%', '2P%.Rank', 'FT%', 'FT%.Rank',
    'Blk%', 'Blk%.Rank', 'Stl%', 'Stl%.Rank',
    'NST%', 'NST%.Rank', 'A%', 'A%.Rank', '3PA%', '3PA%.Rank',
    lastCol, `${lastCol}.Rank`
  ];

  const rows = extractRows($, table, columns);

  return rows
    .filter(row => row.Team !== 'Team' && row.Team !== '')
    .map(row => ({
      ...row,
      Team: stripSeed(row.Team)
    }));
}

// ============================================================================
// POINT DISTRIBUTION PARSER
// ============================================================================

/**
 * Parse point distribution table.
 * Fixed 14 columns.
 *
 * @param {string} html - HTML content
 * @returns {Array<Object>} Parsed point distribution data
 */
export function parsePointDist(html) {
  const { $, table } = getTable(html, 0);

  const columns = [
    'Team', 'Conference',
    'Off-FT', 'Off-FT.Rank', 'Off-2P', 'Off-2P.Rank', 'Off-3P', 'Off-3P.Rank',
    'Def-FT', 'Def-FT.Rank', 'Def-2P', 'Def-2P.Rank', 'Def-3P', 'Def-3P.Rank'
  ];

  const rows = extractRows($, table, columns);

  return rows
    .filter(row => row.Team !== 'Team' && row.Team !== '')
    .map(row => ({
      ...row,
      Team: stripSeed(row.Team)
    }));
}

// ============================================================================
// HEIGHT PARSER
// ============================================================================

/**
 * Parse height/experience table.
 * Year-dependent: 20 columns pre-2008, 22 for 2008+.
 *
 * @param {string} html - HTML content
 * @param {number} season - Season year
 * @returns {Array<Object>} Parsed height data
 */
export function parseHeight(html, season) {
  const { $, table } = getTable(html, 0);

  // KenPom added Continuity columns in 2008
  let columns;
  if (season && season < 2008) {
    columns = [
      'Team', 'Conference',
      'AvgHgt', 'AvgHgt.Rank', 'EffHgt', 'EffHgt.Rank',
      'C-Hgt', 'C-Hgt.Rank', 'PF-Hgt', 'PF-Hgt.Rank',
      'SF-Hgt', 'SF-Hgt.Rank', 'SG-Hgt', 'SG-Hgt.Rank',
      'PG-Hgt', 'PG-Hgt.Rank',
      'Experience', 'Experience.Rank', 'Bench', 'Bench.Rank'
    ];
  } else {
    columns = [
      'Team', 'Conference',
      'AvgHgt', 'AvgHgt.Rank', 'EffHgt', 'EffHgt.Rank',
      'C-Hgt', 'C-Hgt.Rank', 'PF-Hgt', 'PF-Hgt.Rank',
      'SF-Hgt', 'SF-Hgt.Rank', 'SG-Hgt', 'SG-Hgt.Rank',
      'PG-Hgt', 'PG-Hgt.Rank',
      'Experience', 'Experience.Rank', 'Bench', 'Bench.Rank',
      'Continuity', 'Continuity.Rank'
    ];
  }

  const rows = extractRows($, table, columns);

  return rows
    .filter(row => row.Team !== 'Team' && row.Team !== '')
    .map(row => ({
      ...row,
      Team: stripSeed(row.Team)
    }));
}

// ============================================================================
// PLAYER STATS PARSER
// ============================================================================

/**
 * Parse player stats table.
 * ORtg metric returns special format with Poss%.
 * FG metrics (2P, 3P, FT) expand to Made/Attempted/Pct.
 *
 * @param {string} html - HTML content
 * @param {string} metric - Player stat metric
 * @returns {Array<Object>|Array<Array<Object>>} Parsed player stats
 *   (ORtg returns array of 4 tables for different possession thresholds)
 */
export function parsePlayerStats(html, metric = 'eFG') {
  const { $, table } = getTable(html, 0);

  // Base columns
  let columns = ['Rank', 'Player', 'Team'];

  // Handle FG metrics that have Made/Attempted/Pct
  const fgMetrics = ['2P', '3P', 'FT'];
  if (fgMetrics.includes(metric)) {
    columns.push(`${metric}M`, `${metric}A`, `${metric}%`);
  } else {
    columns.push(metric);
  }

  columns.push('Ht', 'Wt', 'Yr');

  const rows = extractRows($, table, columns);

  // Filter header rows and empty ranks
  let filtered = rows.filter(row =>
    row.Rank !== 'Rank' &&
    row.Rank !== '' &&
    row.Player !== ''
  );

  // For ORtg, split the value to extract Poss%
  if (metric === 'ORtg') {
    filtered = filtered.map(row => {
      const ortgValue = row.ORtg || '';
      const parts = ortgValue.split(' ');
      return {
        ...row,
        ORtg: parts[0] || '',
        'Poss%': parts[1] ? parts[1].replace(/[()]/g, '') : ''
      };
    });
  }

  return filtered;
}

/**
 * Parse all player stats tables (for ORtg which has 4 tables).
 *
 * @param {string} html - HTML content
 * @returns {Array<Array<Object>>} Array of 4 parsed tables
 */
export function parseAllPlayerStatsTables(html) {
  const $ = cheerio.load(html);
  const tables = $('table');
  const results = [];

  const columns = ['Rank', 'Player', 'Team', 'ORtg', 'Ht', 'Wt', 'Yr'];

  tables.each((i, tableEl) => {
    const rows = [];
    const table = $(tableEl);
    const tbody = table.find('tbody');
    const bodyRows = tbody.length > 0 ? tbody.find('tr') : table.find('tr').slice(1);

    bodyRows.each((j, row) => {
      const cells = $(row).find('td');
      if (cells.length === 0) return;

      const rowData = {};
      cells.each((k, cell) => {
        if (k < columns.length) {
          rowData[columns[k]] = $(cell).text().trim();
        }
      });

      if (rowData.Rank && rowData.Rank !== 'Rank') {
        // Split ORtg to extract Poss%
        const ortgValue = rowData.ORtg || '';
        const parts = ortgValue.split(' ');
        rowData.ORtg = parts[0] || '';
        rowData['Poss%'] = parts[1] ? parts[1].replace(/[()]/g, '') : '';
        rows.push(rowData);
      }
    });

    if (rows.length > 0) {
      results.push(rows);
    }
  });

  return results;
}

// ============================================================================
// KPOY PARSER
// ============================================================================

/**
 * Parse KPOY (Player of the Year) table.
 * Extracts player info from complex column format.
 *
 * @param {string} html - HTML content
 * @param {number} season - Season year
 * @returns {{ kpoy: Array<Object>, mvp: Array<Object>|null }}
 */
export function parseKpoy(html, season) {
  const $ = cheerio.load(html);
  const tables = $('table');

  const parseKpoyTable = (table) => {
    const rows = [];
    const tbody = table.find('tbody');
    const bodyRows = tbody.length > 0 ? tbody.find('tr') : table.find('tr').slice(1);

    bodyRows.each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const rank = $(cells[0]).text().trim();
      const playerInfo = $(cells[1]).text().trim();
      const rating = $(cells[2]).text().trim();

      if (rank === 'Rank' || rank === '') return;

      // Parse player info: "Name · Weight, Year, Hometown"
      // Then extract team from name portion
      const parts = playerInfo.split(' · ');
      const nameTeam = parts[0] || '';
      const details = parts[1] || '';

      // Extract team (last part after comma in name section)
      const nameParts = nameTeam.split(', ');
      const player = nameParts[0] || '';
      const teamInfo = nameParts[1] || '';

      // Team name has numbers (height) we need to extract
      const teamMatch = teamInfo.match(/^([A-Za-z.\s&']+)/);
      const team = teamMatch ? teamMatch[1].trim() : teamInfo;

      // Extract height from team info
      const heightMatch = teamInfo.match(/(\d+-\d+)/);
      const height = heightMatch ? heightMatch[1] : '';

      // Parse details: "Weight, Year, Hometown"
      const detailParts = details.split(', ');
      const weight = detailParts[0] || '';
      const year = detailParts[1] || '';
      const hometown = detailParts.slice(2).join(', ') || '';

      rows.push({
        Rank: rank,
        Player: player,
        Team: team,
        Height: height,
        Weight: weight,
        Year: year,
        Hometown: hometown,
        'KPOY Rating': rating
      });
    });

    return rows;
  };

  const result = {
    kpoy: tables.length > 0 ? parseKpoyTable(tables.eq(0)) : [],
    mvp: null
  };

  // MVP table was added to KenPom in 2013 season
  if (season && season >= 2013 && tables.length > 1) {
    result.mvp = parseKpoyTable(tables.eq(tables.length - 1));
  }

  return result;
}

// ============================================================================
// REFS PARSER
// ============================================================================

/**
 * Parse referee rankings table.
 *
 * @param {string} html - HTML content
 * @returns {Array<Object>} Parsed referee data
 */
export function parseRefs(html) {
  const { $, table } = getTable(html, 0);

  // Columns: Rank, Name, Rating, Games, Last Game, Game Score, Box
  // We drop Box column
  const columns = ['Rank', 'Name', 'Rating', 'Games', 'Last Game', 'Game Score', 'Box'];

  const rows = extractRows($, table, columns);

  return rows
    .filter(row => row.Rating !== 'Rating' && row.Rank !== '')
    .map(row => {
      const { Box, ...rest } = row;
      return rest;
    });
}

// ============================================================================
// HCA PARSER
// ============================================================================

/**
 * Parse home court advantage table.
 *
 * @param {string} html - HTML content
 * @returns {Array<Object>} Parsed HCA data
 */
export function parseHca(html) {
  const { $, table } = getTable(html, 0);

  const columns = [
    'Team', 'Conference',
    'HCA', 'HCA.Rank',
    'PF', 'PF.Rank',
    'Pts', 'Pts.Rank',
    'NST', 'NST.Rank',
    'Blk', 'Blk.Rank',
    'Elev', 'Elev.Rank'
  ];

  const rows = extractRows($, table, columns);

  return rows.filter(row => row.Team !== 'Team' && row.Team !== '');
}

// ============================================================================
// ARENAS PARSER
// ============================================================================

/**
 * Parse arenas table.
 * Splits Arena and Alternate columns to extract capacity.
 *
 * @param {string} html - HTML content
 * @returns {Array<Object>} Parsed arena data
 */
export function parseArenas(html) {
  const { $, table } = getTable(html, 0);

  const columns = ['Rank', 'Team', 'Conference', 'Arena', 'Alternate'];

  const rows = extractRows($, table, columns);

  return rows
    .filter(row => row.Team !== 'Team' && row.Rank !== '')
    .map(row => {
      // Split Arena on ' (' to get name and capacity
      const arenaMatch = (row.Arena || '').match(/^(.+?)\s*\((\d+)\)$/);
      const altMatch = (row.Alternate || '').match(/^(.+?)\s*\((\d+)\)$/);

      return {
        Rank: row.Rank,
        Team: row.Team,
        Conference: row.Conference,
        Arena: arenaMatch ? arenaMatch[1].trim() : row.Arena,
        'Arena.Capacity': arenaMatch ? arenaMatch[2] : '',
        Alternate: altMatch ? altMatch[1].trim() : row.Alternate,
        'Alternate.Capacity': altMatch ? altMatch[2] : ''
      };
    });
}

// ============================================================================
// GAME ATTRIBS PARSER
// ============================================================================

/**
 * Parse game attributes table.
 * Splits Location to extract Arena name.
 *
 * @param {string} html - HTML content
 * @returns {Array<Object>} Parsed game attributes
 */
export function parseGameAttribs(html) {
  const { $, table } = getTable(html, 0);

  // Columns: Rank, Date, Game, Box, Location, Conf.Matchup, Value
  const columns = ['Rank', 'Date', 'Game', 'Box', 'Location', 'Conf.Matchup', 'Value'];

  const rows = extractRows($, table, columns);

  return rows
    .filter(row => row.Rank !== 'Rank' && row.Rank !== '')
    .map(row => {
      // Split Location on ' (' to get location and arena
      const locMatch = (row.Location || '').match(/^(.+?)\s*\((.+)\)$/);

      const { Box, ...rest } = row;
      return {
        ...rest,
        Location: locMatch ? locMatch[1].trim() : row.Location,
        Arena: locMatch ? locMatch[2].replace(/\)$/, '') : ''
      };
    });
}

// ============================================================================
// PROGRAM RATINGS PARSER
// ============================================================================

/**
 * Parse program ratings table.
 *
 * @param {string} html - HTML content
 * @returns {Array<Object>} Parsed program ratings
 */
export function parseProgramRatings(html) {
  const { $, table } = getTable(html, 0);

  const columns = [
    'Rank', 'Team', 'Conference', 'Rating',
    'kenpom.Best.Rank', 'kenpom.Best.Season',
    'kenpom.Worst.Rank', 'kenpom.Worst.Season',
    'kenpom.Median.Rank',
    'kenpom.Top10.Finishes', 'kenpom.Top25.Finishes', 'kenpom.Top50.Finishes',
    'NCAA.Champs', 'NCAA.F4', 'NCAA.S16', 'NCAA.R1',
    'Change'
  ];

  const rows = extractRows($, table, columns);

  return rows.filter(row => row.Team !== 'Team' && row.Rank !== '');
}

// ============================================================================
// TRENDS PARSER
// ============================================================================

/**
 * Parse trends table.
 *
 * @param {string} html - HTML content
 * @returns {Array<Object>} Parsed trends data
 */
export function parseTrends(html) {
  const { $, table } = getTable(html, 0);

  // Extract headers from the table
  const headers = [];
  table.find('thead tr th, thead tr td').each((i, el) => {
    headers.push($(el).text().trim() || `Column${i}`);
  });

  const rows = extractRows($, table, headers);

  // Drop last 5 rows which contain summary/totals, matching kenpompy behavior
  return rows.slice(0, -5);
}

// ============================================================================
// SCHEDULE PARSER
// ============================================================================

/**
 * Parse team schedule table.
 * Uses table index 1 (second table on page).
 * Handles year-dependent columns and postseason tracking.
 *
 * @param {string} html - HTML content
 * @param {number} season - Season year
 * @returns {Array<Object>} Parsed schedule
 */
export function parseSchedule(html, season) {
  const $ = cheerio.load(html);
  const tables = $('table');

  if (tables.length < 2) {
    throw new Error('Schedule table not found (need at least 2 tables)');
  }

  // Schedule is the second table on team page (index 1); first table is team stats
  const table = tables.eq(1);

  // KenPom added Team Rank column to schedule in 2010
  let columns;
  if (season && season < 2010) {
    columns = [
      'Date', 'Opponent Rank', 'Opponent Name', 'Result',
      'Possession Number', 'A', 'Location', 'Record', 'Conference', 'B'
    ];
  } else {
    columns = [
      'Date', 'Team Rank', 'Opponent Rank', 'Opponent Name', 'Result',
      'Possession Number', 'A', 'Location', 'Record', 'Conference', 'B'
    ];
  }

  const rows = [];
  let currentTournament = '';

  const tbody = table.find('tbody');
  const bodyRows = tbody.length > 0 ? tbody.find('tr') : table.find('tr').slice(1);

  bodyRows.each((i, row) => {
    const cells = $(row).find('td');
    const text = $(row).text().trim();

    // Check for tournament header rows
    if (text.includes('Tournament') || text.includes('Postseason')) {
      const match = text.match(/(?:\sConference)?\sTournament.*?$/);
      currentTournament = match ? match[0].trim() : text;
      return;
    }

    if (cells.length === 0) return;

    const rowData = {};
    cells.each((j, cell) => {
      if (j < columns.length) {
        rowData[columns[j]] = $(cell).text().trim();
      }
    });

    // Skip header rows
    if (rowData.Date === 'Date' || rowData.Date === rowData.Result) return;

    // Add tournament info
    rowData.Tournament = currentTournament;

    // Remove unused columns A and B
    delete rowData.A;
    delete rowData.B;

    // Add Team Rank for pre-2010 if missing
    if (season && season < 2010 && !rowData['Team Rank']) {
      rowData['Team Rank'] = '';
    }

    if (Object.keys(rowData).length > 0) {
      rows.push(rowData);
    }
  });

  return rows;
}

// ============================================================================
// FANMATCH PARSER
// ============================================================================

/**
 * Parse FanMatch table.
 * Complex parsing matching kenpompy output format.
 *
 * @param {string} html - HTML content
 * @returns {{ games: Array<Object>, summary: Object|null }}
 */
export function parseFanMatch(html) {
  const $ = cheerio.load(html);

  // Check for no games message
  if (html.includes('Sorry, no games today')) {
    return { games: [], summary: null };
  }

  const tables = $('table');
  if (tables.length === 0) {
    return { games: [], summary: null };
  }

  const table = tables.eq(0);

  // Get header row to determine column names
  const headerRow = table.find('thead tr, tr').first();
  const headers = [];
  headerRow.find('th, td').each((i, cell) => {
    headers.push($(cell).text().trim());
  });

  const rows = [];
  const tbody = table.find('tbody');
  const bodyRows = tbody.length > 0 ? tbody.find('tr') : table.find('tr').slice(1);

  let summary = {
    linesOfNight: [],
    ppg: null,
    avgEff: null,
    pos40: null,
    meanAbsErrPredTotalScore: null,
    biasPredTotalScore: null,
    meanAbsErrPredMov: null,
    recordFavs: null,
    expectedRecordFavs: null,
    exactMov: null
  };

  const gameRows = [];
  const extraRows = [];
  let foundExtraSection = false;

  bodyRows.each((i, row) => {
    const text = $(row).text().trim();

    // Skip header row if repeated
    if (text.startsWith('Game') && text.includes('Prediction')) return;

    // Check for "of the night" section start
    if (text.includes('the night') || text.includes('of the Night')) {
      foundExtraSection = true;
    }

    if (foundExtraSection) {
      extraRows.push(text);
      return;
    }

    const cells = $(row).find('td');
    if (cells.length === 0) return;

    const rowData = {};
    cells.each((j, cell) => {
      const cellText = $(cell).text().trim();
      if (j < headers.length && headers[j]) {
        rowData[headers[j]] = cellText;
      }
    });

    if (!rowData.Game || rowData.Game === 'Game') return;

    gameRows.push(rowData);
  });

  // Parse summary stats from extra rows
  for (const text of extraRows) {
    if (text.includes('PPG')) {
      const ppgMatch = text.match(/(\d+\.?\d*)\s*PPG/);
      const effMatch = text.match(/(\d+\.?\d*)\s*Avg Eff/);
      const posMatch = text.match(/(\d+\.?\d*)\s*Pos\/40/);
      if (ppgMatch) summary.ppg = parseFloat(ppgMatch[1]);
      if (effMatch) summary.avgEff = parseFloat(effMatch[1]);
      if (posMatch) summary.pos40 = parseFloat(posMatch[1]);
    }
    if (text.includes('Mean Abs') && text.includes('Pred Total')) {
      const errMatch = text.match(/Mean Abs Err.*?(\d+\.?\d*)/);
      const biasMatch = text.match(/Bias.*?(-?\d+\.?\d*)/);
      if (errMatch) summary.meanAbsErrPredTotalScore = parseFloat(errMatch[1]);
      if (biasMatch) summary.biasPredTotalScore = parseFloat(biasMatch[1]);
    }
    if (text.includes('Mean Abs') && text.includes('MOV')) {
      const errMatch = text.match(/Mean Abs Err.*?(\d+\.?\d*)/);
      const recordMatch = text.match(/Record.*?(\d+-\d+)/);
      if (errMatch) summary.meanAbsErrPredMov = parseFloat(errMatch[1]);
      if (recordMatch) summary.recordFavs = recordMatch[1];
    }
    if (text.includes('the night') && !text.includes('PPG')) {
      summary.linesOfNight.push(text);
    }
  }

  // Process each game row
  const games = gameRows.map(rowData => {
    const game = {};

    // Keep original Game string
    game.Game = rowData.Game || '';

    // Extract MVP if present in Game string
    const mvpMatch = game.Game.match(/\s*MVP:\s*(.+)$/);
    if (mvpMatch) {
      game.MVP = mvpMatch[1].trim();
      game.Game = game.Game.replace(/\s*MVP:\s*.+$/, '');
    } else {
      game.MVP = null;
    }

    // Extract tournament label
    const tourneyMatch = game.Game.match(/\s+([A-Za-z0-9]{2,}-T|NCAA)\s*$/);
    if (tourneyMatch) {
      game.Tournament = tourneyMatch[1];
      game.Game = game.Game.replace(/\s+[A-Za-z0-9]{2,}-T\s*$/, '').replace(/\s+NCAA\s*$/, '');
    } else {
      game.Tournament = null;
    }

    // Extract possessions from Game string [XX]
    const possMatch = game.Game.match(/\s*\[(\d+)\]\s*/);
    if (possMatch) {
      game.Possessions = possMatch[1];
      game.Game = game.Game.replace(/\s*\[\d+\]\s*/, ' ').trim();
    } else {
      game.Possessions = null;
    }

    // Thrill Score - keep original column name with space
    const thrillScore = rowData['Thrill Score'] || rowData.ThrillScore || '';
    // First 4-5 chars are the score, rest is rank
    const thrillMatch = thrillScore.match(/^([\d.]+)/);
    game['Thrill Score'] = thrillMatch ? thrillMatch[1] : thrillScore.substring(0, 5).trim();

    // Come back - keep original column name
    const comeback = rowData['Come back'] || rowData.Comeback || '';
    const comebackParts = comeback.split('·');
    game['Come back'] = comebackParts[0].trim();

    // Excite ment - keep original column name
    const excitement = rowData['Excite ment'] || rowData.Excitement || '';
    const excitementParts = excitement.split('·');
    game['Excite ment'] = excitementParts[0].trim();

    // Parse prediction
    const pred = rowData.Prediction || '';
    const predRegex = /^(.+?)\s+(\d+-\d+)\s*\((\d+%)\)\s*\[(\d+)\]/;
    const predMatch = pred.match(predRegex);

    if (predMatch) {
      game.PredictedWinner = predMatch[1].trim();
      game.PredictedScore = predMatch[2];
      game.WinProbability = predMatch[3];
      game.PredictedPossessions = parseFloat(predMatch[4]);

      // Calculate PredictedMOV from PredictedScore
      const scores = predMatch[2].split('-').map(Number);
      game.PredictedMOV = scores.length === 2 ? scores[0] - scores[1] : null;
    } else {
      // Try simpler match without possessions
      const simplePredMatch = pred.match(/^(.+?)\s+(\d+-\d+)\s*\((\d+%)\)/);
      if (simplePredMatch) {
        game.PredictedWinner = simplePredMatch[1].trim();
        game.PredictedScore = simplePredMatch[2];
        game.WinProbability = simplePredMatch[3];
        game.PredictedPossessions = null;
        const scores = simplePredMatch[2].split('-').map(Number);
        game.PredictedMOV = scores.length === 2 ? scores[0] - scores[1] : null;
      } else {
        game.PredictedWinner = null;
        game.PredictedScore = null;
        game.WinProbability = null;
        game.PredictedPossessions = null;
        game.PredictedMOV = null;
      }
    }

    // Use predicted possessions if actual not available
    if (!game.Possessions && game.PredictedPossessions) {
      game.Possessions = String(game.PredictedPossessions);
    }

    // Parse game result to extract Winner/Loser with scores and ranks
    const gameResult = parseGameResult(game.Game);
    game.Winner = gameResult.Winner;
    game.WinnerRank = gameResult.WinnerRank;
    game.WinnerScore = gameResult.WinnerScore;
    game.Loser = gameResult.Loser;
    game.LoserRank = gameResult.LoserRank;
    game.LoserScore = gameResult.LoserScore;
    game.OT = gameResult.OT;
    game.ActualMOV = gameResult.ActualMOV;

    // Parse predicted loser from Game and PredictedWinner
    game.PredictedLoser = parsePredictedLoser(game.Game, game.PredictedWinner);

    return game;
  });

  return { games, summary: summary.ppg ? summary : null };
}

/**
 * Parse game result string into structured winner/loser data.
 * Handles multiple formats:
 *   - Completed: "233 Rice 77, 273 FIU 70"
 *   - With OT: "233 Rice 77, 273 FIU 70 (OT)"
 *   - Away: "233 Rice at 273 FIU"
 *   - Neutral: "233 Rice vs. 273 FIU"
 *
 * @param {string} gameStr - Game string to parse
 * @returns {Object} Parsed game result with Winner, Loser, scores, ranks
 */
export function parseGameResult(gameStr) {
  const result = {
    Winner: null,
    WinnerRank: null,
    WinnerScore: null,
    Loser: null,
    LoserRank: null,
    LoserScore: null,
    OT: null,
    ActualMOV: null,
    isCompleted: false,
    isNeutral: false,
    isAway: false
  };

  if (!gameStr) return result;

  // Check for OT indicator
  const otMatch = gameStr.match(/\((\d?OT)\)$/);
  if (otMatch) {
    result.OT = otMatch[1];
    gameStr = gameStr.replace(/\s*\(\d?OT\)\s*$/, '').trim();
  }

  // Try comma-separated format (completed game): "233 Rice 77, 273 FIU 70"
  let teams = gameStr.split(', ');

  if (teams.length === 2) {
    result.isCompleted = true;

    // First team is winner
    const winnerParts = teams[0].trim().split(/\s+/);
    const loserParts = teams[1].trim().split(/\s+/);

    if (winnerParts.length >= 3) {
      result.WinnerRank = winnerParts[0];
      result.WinnerScore = winnerParts[winnerParts.length - 1];
      result.Winner = winnerParts.slice(1, -1).join(' ');
    }

    if (loserParts.length >= 3) {
      result.LoserRank = loserParts[0];
      result.LoserScore = loserParts[loserParts.length - 1];
      result.Loser = loserParts.slice(1, -1).join(' ');
    }

    // Calculate actual margin of victory
    if (result.WinnerScore && result.LoserScore) {
      const winScore = parseInt(result.WinnerScore);
      const loseScore = parseInt(result.LoserScore);
      if (!isNaN(winScore) && !isNaN(loseScore)) {
        result.ActualMOV = winScore - loseScore;
      }
    }

    return result;
  }

  // Try "at" format (away game): "233 Rice at 273 FIU"
  teams = gameStr.split(' at ');
  if (teams.length === 2) {
    result.isAway = true;

    const team1Parts = teams[0].trim().split(/\s+/);
    const team2Parts = teams[1].trim().split(/\s+/);

    // For upcoming games, no scores - team name is everything after rank
    if (team1Parts.length >= 2) {
      result.WinnerRank = team1Parts[0]; // Actually just team1's rank
      result.Winner = team1Parts.slice(1).join(' ');
    }
    if (team2Parts.length >= 2) {
      result.LoserRank = team2Parts[0]; // Actually just team2's rank
      result.Loser = team2Parts.slice(1).join(' ');
    }

    return result;
  }

  // Try "vs." format (neutral game): "233 Rice vs. 273 FIU"
  teams = gameStr.split(' vs. ');
  if (teams.length === 2) {
    result.isNeutral = true;

    const team1Parts = teams[0].trim().split(/\s+/);
    const team2Parts = teams[1].trim().split(/\s+/);

    if (team1Parts.length >= 2) {
      result.WinnerRank = team1Parts[0];
      result.Winner = team1Parts.slice(1).join(' ');
    }
    if (team2Parts.length >= 2) {
      result.LoserRank = team2Parts[0];
      result.Loser = team2Parts.slice(1).join(' ');
    }

    return result;
  }

  return result;
}

/**
 * Parse predicted loser from game string and predicted winner.
 * Matches kenpompy logic for extracting team names.
 */
function parsePredictedLoser(gameStr, predictedWinner) {
  const parsed = parseGameResult(gameStr);

  if (!predictedWinner) return null;

  // For completed games, compare with winner
  if (parsed.isCompleted) {
    return parsed.Winner !== predictedWinner ? parsed.Winner : parsed.Loser;
  }

  // For upcoming games, return the team that isn't the predicted winner
  if (parsed.Winner && parsed.Loser) {
    return parsed.Winner !== predictedWinner ? parsed.Winner : parsed.Loser;
  }

  return null;
}

// ============================================================================
// VALID TEAMS PARSER
// ============================================================================

/**
 * Extract valid team names from homepage.
 *
 * @param {string} html - HTML content
 * @returns {Array<string>} List of team names
 */
export function parseValidTeams(html) {
  const $ = cheerio.load(html);
  const teams = [];

  // Teams are in links to team.php
  $('a[href*="team.php"]').each((i, el) => {
    let team = $(el).text().trim();
    team = stripSeed(team);
    if (team && team !== 'Team' && !teams.includes(team)) {
      teams.push(team);
    }
  });

  return teams;
}

// ============================================================================
// SCOUTING REPORT PARSER
// ============================================================================

/**
 * Default stats object for scouting report.
 */
const DEFAULT_SCOUTING_STATS = {
  OE: '', 'OE.Rank': '', DE: '', 'DE.Rank': '',
  Tempo: '', 'Tempo.Rank': '', APLO: '', 'APLO.Rank': '', APLD: '', 'APLD.Rank': '',
  eFG: '', 'eFG.Rank': '', DeFG: '', 'DeFG.Rank': '',
  TOPct: '', 'TOPct.Rank': '', DTOPct: '', 'DTOPct.Rank': '',
  ORPct: '', 'ORPct.Rank': '', DORPct: '', 'DORPct.Rank': '',
  FTR: '', 'FTR.Rank': '', DFTR: '', 'DFTR.Rank': '',
  '3Pct': '', '3Pct.Rank': '', D3Pct: '', 'D3Pct.Rank': '',
  '2Pct': '', '2Pct.Rank': '', D2Pct: '', 'D2Pct.Rank': '',
  FTPct: '', 'FTPct.Rank': '', DFTPct: '', 'DFTPct.Rank': '',
  BlockPct: '', 'BlockPct.Rank': '', DBlockPct: '', 'DBlockPct.Rank': '',
  StlRate: '', 'StlRate.Rank': '', DStlRate: '', 'DStlRate.Rank': '',
  NSTRate: '', 'NSTRate.Rank': '', DNSTRate: '', 'DNSTRate.Rank': '',
  '3PARate': '', '3PARate.Rank': '', D3PARate: '', 'D3PARate.Rank': '',
  ARate: '', 'ARate.Rank': '', DARate: '', 'DARate.Rank': '',
  PD3: '', 'PD3.Rank': '', DPD3: '', 'DPD3.Rank': '',
  PD2: '', 'PD2.Rank': '', DPD2: '', 'DPD2.Rank': '',
  PD1: '', 'PD1.Rank': '', DPD1: '', 'DPD1.Rank': ''
};

/**
 * Parse scouting report from inline JavaScript.
 * Extracts team stats from JavaScript code embedded in the team page.
 *
 * @param {string} html - HTML content
 * @param {boolean} conferenceOnly - Extract only conference stats
 * @returns {Object} Scouting report stats with values and ranks
 */
export function parseScoutingReport(html, conferenceOnly = false) {
  const $ = cheerio.load(html);
  const stats = { ...DEFAULT_SCOUTING_STATS };

  // Find inline JavaScript (script without src)
  let scriptContent = '';
  $('script[type="text/javascript"]').each((i, el) => {
    if (!$(el).attr('src')) {
      scriptContent = $(el).html() || '';
      return false; // break
    }
  });

  if (!scriptContent) {
    return stats;
  }

  // Pattern to extract stat tokens and values
  const extractionPattern = /\$\("td#([A-Za-z0-9]+)"\)\.html\("(.+?)"\);/g;

  // Pattern to find the right function block
  const functionPattern = conferenceOnly
    ? /\$\(':checkbox'\)\.click\(function\(\) \{([^}]+)\}/
    : /function tableStart\(\) \{([^}]+)\}/;

  const functionMatch = scriptContent.match(functionPattern);
  if (!functionMatch) {
    return stats;
  }

  const functionBlock = functionMatch[1];

  // Extract all stat assignments from the function block
  let match;
  const statPattern = /\$\("td#([A-Za-z0-9]+)"\)\.html\("(.+?)"\);/g;

  while ((match = statPattern.exec(functionBlock)) !== null) {
    const token = match[1];
    const valueHtml = match[2];

    // Parse the HTML to extract value and rank
    // Format: <a href="...">value</a><span class="seed">rank</span>
    const valueMatch = valueHtml.match(/>([^<]+)<\/a>/);
    const rankMatch = valueHtml.match(/class="seed">(\d+)</);

    if (valueMatch && rankMatch) {
      const value = parseFloat(valueMatch[1]);
      const rank = parseInt(rankMatch[1]);

      if (!isNaN(value)) {
        stats[token] = value;
        stats[`${token}.Rank`] = rank;
      }
    }
  }

  return stats;
}

// ============================================================================
// CONFERENCE PARSERS
// ============================================================================

/**
 * Parse conference standings table.
 *
 * @param {string} html - HTML content
 * @returns {Array<Object>} Conference standings
 */
export function parseConferenceStandings(html) {
  const { $, table } = getTable(html, 0);

  const rows = [];
  const tbody = table.find('tbody');
  const bodyRows = tbody.length > 0 ? tbody.find('tr') : table.find('tr').slice(1);

  // Get headers and add .Rank suffix to duplicates
  const headers = [];
  table.find('thead tr th, thead tr td').each((i, el) => {
    let text = $(el).text().trim() || `Column${i}`;
    if (headers.includes(text)) {
      text = `${text}.Rank`;
    }
    headers.push(text);
  });

  bodyRows.each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length === 0) return;

    const rowData = {};
    cells.each((j, cell) => {
      if (j < headers.length) {
        rowData[headers[j]] = $(cell).text().trim();
      }
    });

    // Extract seed from team name
    if (rowData.Team) {
      const seed = extractSeed(rowData.Team);
      rowData.Seed = seed || '';
      rowData.Team = stripSeed(rowData.Team);
    }

    if (Object.keys(rowData).length > 0) {
      rows.push(rowData);
    }
  });

  return rows;
}

/**
 * Parse conference offense table (index 1).
 *
 * @param {string} html - HTML content
 * @returns {Array<Object>} Conference offense stats
 */
export function parseConferenceOffense(html) {
  const { $, table } = getTable(html, 1);
  return parseConferenceTable($, table);
}

/**
 * Parse conference defense table (index 2).
 *
 * @param {string} html - HTML content
 * @returns {Array<Object>} Conference defense stats
 */
export function parseConferenceDefense(html) {
  const { $, table } = getTable(html, 2);
  return parseConferenceTable($, table);
}

/**
 * Helper to parse conference offense/defense tables.
 */
function parseConferenceTable($, table) {
  const rows = [];
  const tbody = table.find('tbody');
  const bodyRows = tbody.length > 0 ? tbody.find('tr') : table.find('tr').slice(1);

  // Get headers and add .Rank suffix to duplicates
  const headers = [];
  table.find('thead tr th, thead tr td').each((i, el) => {
    let text = $(el).text().trim() || `Column${i}`;
    if (headers.includes(text)) {
      text = `${text}.Rank`;
    }
    headers.push(text);
  });

  bodyRows.each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length === 0) return;

    const rowData = {};
    cells.each((j, cell) => {
      if (j < headers.length) {
        rowData[headers[j]] = $(cell).text().trim();
      }
    });

    if (Object.keys(rowData).length > 0) {
      rows.push(rowData);
    }
  });

  return rows;
}

/**
 * Parse conference aggregate stats.
 * Used for both single conference and all conferences.
 *
 * @param {string} html - HTML content
 * @param {boolean} singleConf - Whether parsing single conference page
 * @returns {Array<Object>} Aggregate stats
 */
export function parseConferenceAggregateStats(html, singleConf = false) {
  const $ = cheerio.load(html);
  const tables = $('table');

  if (singleConf) {
    // Single conference page: aggregate stats are in third-to-last and second-to-last tables
    // (last table is a footer/navigation table)
    const mainTable = tables.eq(tables.length - 3);
    const pctTable = tables.eq(tables.length - 2);

    const mainRows = parseConferenceStatsTable($, mainTable);
    const pctRows = parseConferenceStatsTable($, pctTable);

    // Combine and format
    return [...mainRows, ...pctRows].map(row => ({
      Stat: row.Stat ? row.Stat.split(' (')[0] : '',
      Value: row.Value,
      Rank: row.Rank
    }));
  } else {
    // All conferences: first table from confstats.php
    const table = tables.eq(0);
    return parseConferenceTable($, table);
  }
}

/**
 * Helper to parse conference stats tables (for aggregate).
 */
function parseConferenceStatsTable($, table) {
  const rows = [];
  const tbody = table.find('tbody');
  const bodyRows = tbody.length > 0 ? tbody.find('tr') : table.find('tr').slice(1);

  bodyRows.each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const stat = $(cells[0]).text().trim();
    const value = $(cells[1]).text().trim();
    const rank = $(cells[2]).text().trim();

    if (stat) {
      rows.push({ Stat: stat, Value: value, Rank: rank });
    }
  });

  return rows;
}
