#!/usr/bin/env node

/**
 * KenPom API CLI
 *
 * Command-line interface for fetching KenPom.com college basketball data.
 *
 * Usage:
 *   kenpom --ratings --year 2025
 *   kenpom --efficiency --four-factors --year 2024
 *   kenpom --player-stats --metric eFG --year 2025
 *   kenpom --all --year 2025
 */

import { createRequire } from 'module';
import { program } from 'commander';
import { KenpomAPI } from './api.js';
import {
  PLAYER_METRICS,
  GAME_ATTRIB_METRICS,
  CONFERENCES,
} from './config.js';
import {
  writeToFile,
  generateYearRange,
  generateDateRange,
  ncaamStartDate,
  ncaamEndDate,
  randomPause,
} from './utils.js';

// Dynamic version import to prevent drift between package.json and CLI
const require = createRequire(import.meta.url);
const { version } = require('./package.json');

const DEFAULT_DATA_DIR = 'datasets';

program
  .name('kenpom')
  .description('KenPom.com college basketball data fetcher')
  .version(version);

// ============================================================================
// CATEGORY FLAGS
// ============================================================================

program
  .option('--all', 'Fetch all endpoints')
  .option('--all-single', 'Fetch all single-fetch endpoints (no year iteration)')
  .option('--all-yearly', 'Fetch all yearly endpoints')
  .option('--all-teams', 'Fetch team schedules');

// ============================================================================
// SINGLE-FETCH ENDPOINTS
// ============================================================================

program
  .option('--arenas', 'Fetch arena data (2010+)')
  .option('--program-ratings', 'Fetch all-time program ratings')
  .option('--trends', 'Fetch statistical trends')
  .option('--hca', 'Fetch home court advantage data');

// ============================================================================
// YEARLY ENDPOINTS
// ============================================================================

program
  .option('--ratings', 'Fetch Pomeroy ratings (1999+)')
  .option('--efficiency', 'Fetch efficiency stats (1999+)')
  .option('--four-factors', 'Fetch four factors (1999+)')
  .option('--team-stats', 'Fetch team statistics (1999+)')
  .option('--point-dist', 'Fetch point distribution (1999+)')
  .option('--height', 'Fetch height/experience (2007+)')
  .option('--player-stats', 'Fetch player statistics (2004+)')
  .option('--kpoy', 'Fetch Player of the Year (2011+)')
  .option('--refs', 'Fetch referee rankings (2016+)')
  .option('--game-attribs', 'Fetch game attributes (2010+)');

// ============================================================================
// TEAM-BASED ENDPOINTS
// ============================================================================

program
  .option('--valid-teams', 'Fetch list of valid team names')
  .option('--schedule', 'Fetch team schedules');

// ============================================================================
// DATE-BASED ENDPOINTS
// ============================================================================

program
  .option('--fanmatch', 'Fetch FanMatch predictions/results')
  .option('--fanmatch-date <date>', 'Fetch FanMatch for single date (YYYY-MM-DD)');

// ============================================================================
// PARAMETERS
// ============================================================================

program
  .option('--year <year>', 'Single season year', parseInt)
  .option('--start <year>', 'Start year for range', parseInt)
  .option('--end <year>', 'End year for range', parseInt)
  .option('--team <name>', 'Team name filter')
  .option('--conference <code>', 'Conference code filter')
  .option('--metric <name>', 'Metric for player/game stats', 'eFG')
  .option('--all-metrics', 'Fetch all player metrics')
  .option('--defense', 'Fetch defensive stats for team-stats');

// ============================================================================
// OTHER OPTIONS
// ============================================================================

program
  .option('--output-dir <path>', 'Output directory', DEFAULT_DATA_DIR)
  .option('--log-level <level>', 'Log level (DEBUG, INFO, WARNING, ERROR)', 'INFO')
  .option('--client <tier>', 'HTTP client tier (cloudscraper, puppeteer, auto)', 'auto')
  .option('--dry-run', 'Preview what would be fetched')
  .option('--examples', 'Show usage examples');

program.parse();

const opts = program.opts();

// ============================================================================
// SHOW EXAMPLES
// ============================================================================

if (opts.examples) {
  console.log(`
KenPom API CLI - Usage Examples
================================

# Fetch ratings for current season
kenpom --ratings

# Fetch ratings for specific year
kenpom --ratings --year 2025

# Fetch multiple yearly endpoints
kenpom --efficiency --four-factors --year 2024

# Fetch all yearly endpoints for a year
kenpom --all-yearly --year 2025

# Fetch all endpoints for multiple years
kenpom --all --start 2020 --end 2025

# Fetch player stats with specific metric
kenpom --player-stats --metric ORtg --year 2025

# Fetch all player metrics
kenpom --player-stats --all-metrics --year 2025

# Fetch player stats for a conference
kenpom --player-stats --conference ACC --year 2025

# Fetch team schedule
kenpom --schedule --team Duke --year 2025

# Fetch FanMatch for a season
kenpom --fanmatch --year 2025

# Dry run to preview
kenpom --all --year 2025 --dry-run

# Use specific HTTP client
kenpom --ratings --year 2025 --client puppeteer

Valid Metrics:
  Player Stats: ${PLAYER_METRICS.join(', ')}
  Game Attribs: ${GAME_ATTRIB_METRICS.join(', ')}

Valid Conferences:
  ${CONFERENCES.join(', ')}
`);
  process.exit(0);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  // Validate arguments
  if ((opts.start && !opts.end) || (!opts.start && opts.end)) {
    console.error('Error: --start and --end must be used together');
    process.exit(1);
  }

  if (opts.start && opts.end && opts.start > opts.end) {
    console.error(`Error: --start (${opts.start}) cannot be greater than --end (${opts.end})`);
    process.exit(1);
  }

  // Expand category flags
  if (opts.all) {
    opts.allSingle = true;
    opts.allYearly = true;
    opts.allTeams = true;
  }

  if (opts.allSingle) {
    opts.arenas = true;
    opts.programRatings = true;
    opts.trends = true;
    opts.hca = true;
  }

  if (opts.allYearly) {
    opts.ratings = true;
    opts.efficiency = true;
    opts.fourFactors = true;
    opts.teamStats = true;
    opts.pointDist = true;
    opts.height = true;
    opts.playerStats = true;
    opts.kpoy = true;
    opts.refs = true;
    opts.gameAttribs = true;
    opts.validTeams = true;
  }

  if (opts.allTeams) {
    opts.schedule = true;
  }

  // Check if any endpoint is selected
  const endpoints = [
    opts.arenas, opts.programRatings, opts.trends, opts.hca,
    opts.ratings, opts.efficiency, opts.fourFactors, opts.teamStats,
    opts.pointDist, opts.height, opts.playerStats, opts.kpoy,
    opts.refs, opts.gameAttribs, opts.validTeams, opts.schedule, opts.fanmatch,
    opts.fanmatchDate
  ];

  if (!endpoints.some(Boolean)) {
    console.error('Error: At least one endpoint must be specified');
    console.log('Run: kenpom --examples for usage');
    process.exit(1);
  }

  // Determine year range
  let yearRange = [];
  let modeDesc = '';

  if (opts.year) {
    yearRange = [opts.year];
    modeDesc = `single year: ${opts.year}`;
  } else if (opts.start && opts.end) {
    yearRange = generateYearRange(opts.start, opts.end);
    modeDesc = `year range: ${opts.start}-${opts.end}`;
  } else {
    // Default: current year approximation
    yearRange = [new Date().getFullYear()];
    modeDesc = `default: ${yearRange[0]}`;
  }

  // Display mode
  console.log('='.repeat(80));
  console.log('KenPom Data Fetcher');
  console.log('='.repeat(80));
  console.log(`Mode: ${modeDesc}`);
  console.log(`Years to process: ${yearRange.length}`);
  console.log(`Output directory: ${opts.outputDir}`);
  if (opts.dryRun) {
    console.log('DRY RUN: No data will be fetched');
  }
  console.log('='.repeat(80));
  console.log();

  // Display selected endpoints
  console.log('Selected endpoints:');
  if (opts.arenas) console.log('  ✓ Arenas (2010+)');
  if (opts.programRatings) console.log('  ✓ Program Ratings');
  if (opts.trends) console.log('  ✓ Trends');
  if (opts.hca) console.log('  ✓ Home Court Advantage');
  if (opts.ratings) console.log('  ✓ Pomeroy Ratings (1999+)');
  if (opts.efficiency) console.log('  ✓ Efficiency (1999+)');
  if (opts.fourFactors) console.log('  ✓ Four Factors (1999+)');
  if (opts.teamStats) console.log('  ✓ Team Stats (1999+)');
  if (opts.pointDist) console.log('  ✓ Point Distribution (1999+)');
  if (opts.height) console.log('  ✓ Height/Experience (2007+)');
  if (opts.playerStats) console.log('  ✓ Player Stats (2004+)');
  if (opts.kpoy) console.log('  ✓ Player of the Year (2011+)');
  if (opts.refs) console.log('  ✓ Referee Rankings (2016+)');
  if (opts.gameAttribs) console.log('  ✓ Game Attributes (2010+)');
  if (opts.validTeams) console.log('  ✓ Valid Teams (1999+)');
  if (opts.schedule) console.log('  ✓ Team Schedules (1999+)');
  if (opts.fanmatch) console.log('  ✓ FanMatch');
  if (opts.fanmatchDate) console.log(`  ✓ FanMatch (single date: ${opts.fanmatchDate})`);
  console.log();

  if (opts.dryRun) {
    console.log('Years that would be processed:');
    for (const year of yearRange) {
      console.log(`  - ${year}`);
    }
    console.log('\nDry run complete. No data was fetched.');
    return;
  }

  // Initialize API
  console.log('Initializing KenpomAPI...');
  const api = new KenpomAPI({
    logLevel: opts.logLevel,
    clientTier: opts.client,
  });

  try {
    await api.login();
    console.log('✓ Logged in to KenPom\n');

    // ========================================================================
    // SINGLE-FETCH ENDPOINTS
    // ========================================================================

    if (opts.arenas) {
      console.log('Fetching arenas...');
      const data = await api.getArenas();
      writeToFile(data, `${opts.outputDir}/arenas/arenas.json`);
      console.log('✓ Arenas saved\n');
      await randomPause(2000, 7000);
    }

    if (opts.programRatings) {
      console.log('Fetching program ratings...');
      const data = await api.getProgramRatings();
      writeToFile(data, `${opts.outputDir}/program_ratings/program_ratings.json`);
      console.log('✓ Program ratings saved\n');
      await randomPause(2000, 7000);
    }

    if (opts.trends) {
      console.log('Fetching trends...');
      const data = await api.getTrends();
      writeToFile(data, `${opts.outputDir}/trends/trends.json`);
      console.log('✓ Trends saved\n');
      await randomPause(2000, 7000);
    }

    if (opts.hca) {
      console.log('Fetching home court advantage...');
      const data = await api.getHca();
      writeToFile(data, `${opts.outputDir}/hca/hca.json`);
      console.log('✓ HCA saved\n');
      await randomPause(2000, 7000);
    }

    if (opts.fanmatchDate) {
      const date = opts.fanmatchDate;
      console.log(`Fetching FanMatch for ${date}...`);
      try {
        const data = await api.getFanMatch(date);
        const year = date.substring(0, 4);
        writeToFile(data, `${opts.outputDir}/fanmatch/${year}/fanmatch_${date}.json`);
        console.log(`✓ FanMatch saved for ${date} (${data.games?.length || 0} games)\n`);
      } catch (e) {
        console.log(`✗ No FanMatch data for ${date}\n`);
      }
      await randomPause(2000, 7000);
    }

    // ========================================================================
    // YEARLY ENDPOINTS
    // ========================================================================

    for (const year of yearRange) {
      console.log(`\n--- Processing ${year} ---\n`);

      if (opts.ratings) {
        console.log(`Fetching ratings for ${year}...`);
        const data = await api.getPomeroyRatings(year);
        writeToFile(data, `${opts.outputDir}/ratings/ratings_${year}.json`);
        console.log(`✓ Ratings saved for ${year}`);
        await randomPause(2000, 7000);
      }

      if (opts.efficiency) {
        console.log(`Fetching efficiency for ${year}...`);
        const data = await api.getEfficiency(year);
        writeToFile(data, `${opts.outputDir}/efficiency/efficiency_${year}.json`);
        console.log(`✓ Efficiency saved for ${year}`);
        await randomPause(2000, 7000);
      }

      if (opts.fourFactors) {
        console.log(`Fetching four factors for ${year}...`);
        const data = await api.getFourFactors(year);
        writeToFile(data, `${opts.outputDir}/four_factors/four_factors_${year}.json`);
        console.log(`✓ Four factors saved for ${year}`);
        await randomPause(2000, 7000);
      }

      if (opts.teamStats) {
        console.log(`Fetching team stats for ${year}...`);
        const data = await api.getTeamStats(year, opts.defense);
        const suffix = opts.defense ? '_defense' : '';
        writeToFile(data, `${opts.outputDir}/team_stats/team_stats${suffix}_${year}.json`);
        console.log(`✓ Team stats saved for ${year}`);
        await randomPause(2000, 7000);
      }

      if (opts.pointDist) {
        console.log(`Fetching point distribution for ${year}...`);
        const data = await api.getPointDist(year);
        writeToFile(data, `${opts.outputDir}/point_dist/point_dist_${year}.json`);
        console.log(`✓ Point distribution saved for ${year}`);
        await randomPause(2000, 7000);
      }

      if (opts.height && year >= 2007) {
        console.log(`Fetching height/experience for ${year}...`);
        const data = await api.getHeight(year);
        writeToFile(data, `${opts.outputDir}/height/height_${year}.json`);
        console.log(`✓ Height saved for ${year}`);
        await randomPause(2000, 7000);
      }

      if (opts.playerStats && year >= 2004) {
        if (opts.allMetrics) {
          console.log(`Fetching all player metrics for ${year}...`);
          const data = await api.getAllPlayerStats(year, opts.conference);
          writeToFile(data, `${opts.outputDir}/player_stats/player_stats_${year}.json`);
          console.log(`✓ All player metrics saved for ${year}`);
        } else {
          console.log(`Fetching player stats (${opts.metric}) for ${year}...`);
          const data = await api.getPlayerStats(year, opts.metric, opts.conference);
          writeToFile(data, `${opts.outputDir}/player_stats/player_stats_${opts.metric}_${year}.json`);
          console.log(`✓ Player stats saved for ${year}`);
        }
        await randomPause(2000, 7000);
      }

      if (opts.kpoy && year >= 2011) {
        console.log(`Fetching KPOY for ${year}...`);
        const data = await api.getKpoy(year);
        writeToFile(data, `${opts.outputDir}/kpoy/kpoy_${year}.json`);
        console.log(`✓ KPOY saved for ${year}`);
        await randomPause(2000, 7000);
      }

      if (opts.refs && year >= 2016) {
        console.log(`Fetching refs for ${year}...`);
        const data = await api.getRefs(year);
        writeToFile(data, `${opts.outputDir}/refs/refs_${year}.json`);
        console.log(`✓ Refs saved for ${year}`);
        await randomPause(2000, 7000);
      }

      if (opts.gameAttribs && year >= 2010) {
        // Use 'Excitement' as default for game-attribs since 'eFG' is only valid for player-stats
        const gameMetric = GAME_ATTRIB_METRICS.includes(opts.metric) ? opts.metric : 'Excitement';
        console.log(`Fetching game attributes for ${year}...`);
        const data = await api.getGameAttribs(year, gameMetric);
        writeToFile(data, `${opts.outputDir}/game_attribs/game_attribs_${year}.json`);
        console.log(`✓ Game attributes saved for ${year}`);
        await randomPause(2000, 7000);
      }

      if (opts.validTeams) {
        console.log(`Fetching valid teams for ${year}...`);
        const data = await api.getValidTeams(year);
        writeToFile(data, `${opts.outputDir}/valid_teams/valid_teams_${year}.json`);
        console.log(`✓ Valid teams saved for ${year}`);
        await randomPause(2000, 7000);
      }

      // ======================================================================
      // TEAM-BASED ENDPOINTS
      // ======================================================================

      if (opts.schedule) {
        if (opts.team) {
          // Single team
          console.log(`Fetching schedule for ${opts.team} (${year})...`);
          const data = await api.getSchedule(opts.team, year);
          writeToFile(data, `${opts.outputDir}/schedule/${year}/${opts.team}_schedule_${year}.json`);
          console.log(`✓ Schedule saved for ${opts.team}`);
          await randomPause(2000, 7000);
        } else {
          // All teams - need valid teams first
          console.log(`Fetching schedules for all teams (${year})...`);
          const teams = await api.getValidTeams(year);
          console.log(`Found ${teams.length} teams`);
          await randomPause(2000, 7000);

          for (const team of teams) {
            try {
              const data = await api.getSchedule(team, year);
              writeToFile(data, `${opts.outputDir}/schedule/${year}/${team}_schedule_${year}.json`);
              console.log(`✓ ${team}`);
              await randomPause(2000, 7000);
            } catch (e) {
              console.log(`✗ ${team}: ${e.message}`);
            }
          }
        }
      }

      // ======================================================================
      // DATE-BASED ENDPOINTS
      // ======================================================================

      if (opts.fanmatch && year >= 2014) {
        console.log(`Fetching FanMatch for ${year}...`);
        const dateRange = generateDateRange(ncaamStartDate(year), ncaamEndDate(year));

        for (const date of dateRange) {
          // Skip Feb 29 due to parsing issues
          if (date.endsWith('-02-29')) continue;

          try {
            const data = await api.getFanMatch(date);
            if (data.games && data.games.length > 0) {
              writeToFile(data, `${opts.outputDir}/fanmatch/${year}/fanmatch_${date}.json`);
              console.log(`✓ ${date} (${data.games.length} games)`);
            }
            await randomPause(2000, 7000);
          } catch (e) {
            // Skip dates with no games
          }
        }
        console.log(`✓ FanMatch complete for ${year}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✓ All selected endpoints fetched successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    if (opts.logLevel === 'DEBUG') {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await api.close();
  }
}

main();
