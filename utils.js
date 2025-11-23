/**
 * KenPom API Utilities
 *
 * Helper functions for HTML table parsing, file I/O, rate limiting,
 * and HTTP client creation.
 */

import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { DEFAULT_HEADERS } from './config.js';

// ============================================================================
// HTML TABLE PARSING
// ============================================================================

/**
 * Parse an HTML table into an array of objects.
 * Similar to pandas read_html() functionality.
 *
 * @param {string} html - HTML content containing the table
 * @param {string} selector - CSS selector for the table (default: 'table')
 * @param {number} tableIndex - Index of table if multiple match (default: 0)
 * @returns {Array<Object>} Array of row objects with column names as keys
 */
export function parseTable(html, selector = 'table', tableIndex = 0) {
  const $ = cheerio.load(html);
  const tables = $(selector);

  if (tables.length === 0) {
    throw new Error(`No tables found matching selector: ${selector}`);
  }

  if (tableIndex >= tables.length) {
    throw new Error(`Table index ${tableIndex} out of bounds. Found ${tables.length} tables.`);
  }

  const table = tables.eq(tableIndex);
  return parseTableElement($, table);
}

/**
 * Parse a cheerio table element into an array of objects.
 *
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Cheerio} table - Cheerio table element
 * @returns {Array<Object>} Array of row objects
 */
export function parseTableElement($, table) {
  const headers = [];
  const rows = [];

  // Extract headers from thead or first row
  const thead = table.find('thead');
  let headerRow;

  if (thead.length > 0) {
    headerRow = thead.find('tr').last();
  } else {
    headerRow = table.find('tr').first();
  }

  headerRow.find('th, td').each((i, el) => {
    let text = $(el).text().trim();
    // Handle empty headers
    if (!text) text = `Column${i}`;
    // Handle duplicate headers by appending index
    if (headers.includes(text)) {
      text = `${text}_${i}`;
    }
    headers.push(text);
  });

  // Extract body rows
  const tbody = table.find('tbody');
  const bodyRows = tbody.length > 0 ? tbody.find('tr') : table.find('tr').slice(1);

  bodyRows.each((i, row) => {
    const rowData = {};
    $(row).find('td').each((j, cell) => {
      if (j < headers.length) {
        const text = $(cell).text().trim();
        rowData[headers[j]] = text;
      }
    });

    // Only add non-empty rows
    if (Object.keys(rowData).length > 0) {
      rows.push(rowData);
    }
  });

  return rows;
}

/**
 * Parse all tables from HTML content.
 *
 * @param {string} html - HTML content
 * @param {string} selector - CSS selector for tables
 * @returns {Array<Array<Object>>} Array of parsed tables
 */
export function parseAllTables(html, selector = 'table') {
  const $ = cheerio.load(html);
  const tables = $(selector);
  const results = [];

  tables.each((i, table) => {
    try {
      results.push(parseTableElement($, $(table)));
    } catch (e) {
      // Skip unparseable tables
    }
  });

  return results;
}

/**
 * Extract text content from HTML using CSS selector.
 *
 * @param {string} html - HTML content
 * @param {string} selector - CSS selector
 * @returns {string|null} Text content or null if not found
 */
export function extractText(html, selector) {
  const $ = cheerio.load(html);
  const element = $(selector);
  return element.length > 0 ? element.text().trim() : null;
}

/**
 * Extract the current season from the page title or content.
 *
 * @param {string} html - HTML content
 * @returns {number|null} Season year or null if not found
 */
export function extractSeason(html) {
  const $ = cheerio.load(html);

  // Try to find season in page title
  const title = $('title').text();
  const match = title.match(/(\d{4})/);
  if (match) {
    return parseInt(match[1]);
  }

  // Try content header
  const header = $('#content-header h2').text();
  const headerMatch = header.match(/(\d{4})/);
  if (headerMatch) {
    return parseInt(headerMatch[1]);
  }

  return null;
}

/**
 * Extract valid team names from the homepage.
 *
 * @param {string} html - HTML content of homepage
 * @returns {Array<string>} Array of team names
 */
export function extractTeamNames(html) {
  const $ = cheerio.load(html);
  const teams = [];

  // Teams are in the ratings table with links to team.php
  $('a[href*="team.php"]').each((i, el) => {
    const team = $(el).text().trim();
    if (team && !teams.includes(team)) {
      teams.push(team);
    }
  });

  return teams;
}

// ============================================================================
// FILE I/O
// ============================================================================

/**
 * Write data to a file.
 * Creates directories if they don't exist.
 *
 * @param {any} data - Data to write (will be JSON stringified if object/array)
 * @param {string} filepath - Path to write to
 * @param {string} format - 'json', 'csv', or 'auto' (default: 'auto')
 */
export function writeToFile(data, filepath, format = 'auto') {
  // Create directory if it doesn't exist
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Determine format
  let resolvedFormat = format;
  if (format === 'auto') {
    const ext = path.extname(filepath).toLowerCase();
    resolvedFormat = ext === '.csv' ? 'csv' : 'json';
  }

  if (resolvedFormat === 'csv' && Array.isArray(data) && data.length > 0) {
    // Convert array of objects to CSV
    const headers = Object.keys(data[0]);
    const csvLines = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(h => {
        const val = row[h] ?? '';
        // Escape values with commas or quotes
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvLines.push(values.join(','));
    }

    fs.writeFileSync(filepath, csvLines.join('\n'));
  } else {
    // Write as JSON
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    fs.writeFileSync(filepath, content);
  }
}

/**
 * Read data from a file.
 *
 * @param {string} filepath - Path to read from
 * @param {string} format - 'json', 'text', or 'auto' (default: 'auto')
 * @returns {any} Parsed data
 */
export function readFromFile(filepath, format = 'auto') {
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }

  const content = fs.readFileSync(filepath, 'utf-8');

  let resolvedFormat = format;
  if (format === 'auto') {
    const ext = path.extname(filepath).toLowerCase();
    resolvedFormat = ext === '.json' ? 'json' : 'text';
  }

  if (resolvedFormat === 'json') {
    return JSON.parse(content);
  }

  return content;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Pause execution for specified milliseconds.
 *
 * @param {number} ms - Milliseconds to pause
 * @returns {Promise<void>}
 */
export function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random delay between min and max milliseconds.
 *
 * @param {number} minMs - Minimum milliseconds
 * @param {number} maxMs - Maximum milliseconds
 * @returns {number} Random delay in milliseconds
 */
export function randomDelay(minMs = 2000, maxMs = 7000) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Pause for a random delay between min and max.
 *
 * @param {number} minMs - Minimum milliseconds
 * @param {number} maxMs - Maximum milliseconds
 * @returns {Promise<void>}
 */
export async function randomPause(minMs = 2000, maxMs = 7000) {
  const delay = randomDelay(minMs, maxMs);
  await pause(delay);
}

// ============================================================================
// HTTP CLIENT FACTORY
// ============================================================================

/**
 * Create a cloudscraper client for handling Cloudflare protection.
 *
 * @returns {Promise<Object>} Cloudscraper session
 */
export async function createCloudscraperClient() {
  const cloudscraper = await import('cloudscraper');
  return {
    type: 'cloudscraper',
    client: cloudscraper.default || cloudscraper,
  };
}

/**
 * Create a puppeteer client with stealth (Tier 3).
 *
 * @returns {Promise<Object>} Puppeteer browser and page
 */
export async function createPuppeteerClient() {
  try {
    const puppeteerExtra = await import('puppeteer-extra');
    const StealthPlugin = await import('puppeteer-extra-plugin-stealth');

    const puppeteer = puppeteerExtra.default || puppeteerExtra;
    const stealth = StealthPlugin.default || StealthPlugin;

    puppeteer.use(stealth());

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(DEFAULT_HEADERS['User-Agent']);

    return {
      type: 'puppeteer',
      browser,
      page,
      close: async () => await browser.close(),
    };
  } catch (e) {
    throw new Error(`Puppeteer not available: ${e.message}. Install puppeteer-extra and puppeteer-extra-plugin-stealth.`);
  }
}

// ============================================================================
// SPINNER / PROGRESS
// ============================================================================

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Create a simple CLI spinner.
 *
 * @param {string} message - Message to display
 * @returns {{ update: Function, stop: Function }} Spinner controls
 */
export function createSpinner(message) {
  let frameIndex = 0;
  let interval = null;

  const update = (newMessage) => {
    message = newMessage || message;
  };

  const start = () => {
    interval = setInterval(() => {
      process.stdout.write(`\r${spinnerFrames[frameIndex]} ${message}`);
      frameIndex = (frameIndex + 1) % spinnerFrames.length;
    }, 80);
  };

  const stop = (finalMessage, success = true) => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    const symbol = success ? '✓' : '✗';
    process.stdout.write(`\r${symbol} ${finalMessage || message}\n`);
  };

  start();
  return { update, stop };
}

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Generate an array of years from start to end (inclusive).
 *
 * @param {number} startYear - Start year
 * @param {number} endYear - End year
 * @returns {Array<number>} Array of years
 */
export function generateYearRange(startYear, endYear) {
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  return years;
}

/**
 * Generate an array of dates from start to end (inclusive).
 *
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array<string>} Array of date strings
 */
export function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Get the NCAAM season start date (November 1 of previous year).
 *
 * @param {number} season - Season year (e.g., 2025)
 * @returns {string} Start date (YYYY-MM-DD)
 */
export function ncaamStartDate(season) {
  return `${season - 1}-11-01`;
}

/**
 * Get the NCAAM season end date (April 30).
 *
 * @param {number} season - Season year (e.g., 2025)
 * @returns {string} End date (YYYY-MM-DD)
 */
export function ncaamEndDate(season) {
  return `${season}-04-30`;
}
