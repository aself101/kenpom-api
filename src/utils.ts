/**
 * KenPom API Utilities
 *
 * Helper functions for HTML table parsing, file I/O, rate limiting,
 * and HTTP client creation.
 */

import * as cheerio from 'cheerio';

// Cheerio types - extract from cheerio module
type CheerioAPI = ReturnType<typeof cheerio.load>;
type CheerioElement = ReturnType<CheerioAPI>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CheerioNode = any;
import fs from 'fs';
import path from 'path';
import { DEFAULT_HEADERS } from './config.js';
import type {
  TableRow,
  FileFormat,
  SpinnerControl,
  CloudscraperClient,
  PuppeteerClient,
} from './types.js';

// ============================================================================
// HTML TABLE PARSING
// ============================================================================

/**
 * Parse an HTML table into an array of objects.
 * Similar to pandas read_html() functionality.
 *
 * @param html - HTML content containing the table
 * @param selector - CSS selector for the table (default: 'table')
 * @param tableIndex - Index of table if multiple match (default: 0)
 * @returns Array of row objects with column names as keys
 */
export function parseTable(
  html: string,
  selector: string = 'table',
  tableIndex: number = 0
): TableRow[] {
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
 * @param $ - Cheerio instance
 * @param table - Cheerio table element
 * @returns Array of row objects
 */
export function parseTableElement(
  $: CheerioAPI,
  table: CheerioElement
): TableRow[] {
  const headers: string[] = [];
  const rows: TableRow[] = [];

  // Extract headers from thead or first row
  const thead = table.find('thead');
  let headerRow: CheerioElement;

  if (thead.length > 0) {
    headerRow = thead.find('tr').last();
  } else {
    headerRow = table.find('tr').first();
  }

  headerRow.find('th, td').each((i: number, el: CheerioNode) => {
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

  bodyRows.each((_i: number, row: CheerioNode) => {
    const rowData: TableRow = {};
    $(row).find('td').each((j: number, cell: CheerioNode) => {
      if (j < headers.length) {
        const text = $(cell).text().trim();
        const header = headers[j];
        if (header !== undefined) {
          rowData[header] = text;
        }
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
 * @param html - HTML content
 * @param selector - CSS selector for tables
 * @returns Array of parsed tables
 */
export function parseAllTables(
  html: string,
  selector: string = 'table'
): TableRow[][] {
  const $ = cheerio.load(html);
  const tables = $(selector);
  const results: TableRow[][] = [];

  tables.each((i, table) => {
    try {
      results.push(parseTableElement($, $(table)));
    } catch {
      // Skip unparseable tables
    }
  });

  return results;
}

/**
 * Extract text content from HTML using CSS selector.
 *
 * @param html - HTML content
 * @param selector - CSS selector
 * @returns Text content or null if not found
 */
export function extractText(html: string, selector: string): string | null {
  const $ = cheerio.load(html);
  const element = $(selector);
  return element.length > 0 ? element.text().trim() : null;
}

/**
 * Extract the current season from the page title or content.
 *
 * @param html - HTML content
 * @returns Season year or null if not found
 */
export function extractSeason(html: string): number | null {
  const $ = cheerio.load(html);

  // Try to find season in page title
  const title = $('title').text();
  const match = title.match(/(\d{4})/);
  if (match?.[1]) {
    return parseInt(match[1]);
  }

  // Try content header
  const header = $('#content-header h2').text();
  const headerMatch = header.match(/(\d{4})/);
  if (headerMatch?.[1]) {
    return parseInt(headerMatch[1]);
  }

  return null;
}

/**
 * Extract valid team names from the homepage.
 *
 * @param html - HTML content of homepage
 * @returns Array of team names
 */
export function extractTeamNames(html: string): string[] {
  const $ = cheerio.load(html);
  const teams: string[] = [];

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
 * @param data - Data to write (will be JSON stringified if object/array)
 * @param filepath - Path to write to
 * @param format - 'json', 'csv', or 'auto' (default: 'auto')
 */
export function writeToFile(
  data: unknown,
  filepath: string,
  format: FileFormat = 'auto'
): void {
  // Create directory if it doesn't exist
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Determine format
  let resolvedFormat: FileFormat = format;
  if (format === 'auto') {
    const ext = path.extname(filepath).toLowerCase();
    resolvedFormat = ext === '.csv' ? 'csv' : 'json';
  }

  if (resolvedFormat === 'csv' && Array.isArray(data) && data.length > 0) {
    // Convert array of objects to CSV
    const firstRow = data[0] as TableRow;
    const headers = Object.keys(firstRow);
    const csvLines: string[] = [headers.join(',')];

    for (const row of data as TableRow[]) {
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
 * @param filepath - Path to read from
 * @param format - 'json', 'text', or 'auto' (default: 'auto')
 * @returns Parsed data
 */
export function readFromFile(filepath: string, format: FileFormat = 'auto'): unknown {
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}. Please check that the path is correct and the file exists.`);
  }

  const content = fs.readFileSync(filepath, 'utf-8');

  let resolvedFormat: FileFormat = format;
  if (format === 'auto') {
    const ext = path.extname(filepath).toLowerCase();
    resolvedFormat = ext === '.json' ? 'json' : 'text';
  }

  if (resolvedFormat === 'json') {
    return JSON.parse(content) as unknown;
  }

  return content;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Pause execution for specified milliseconds.
 *
 * @param ms - Milliseconds to pause
 */
export function pause(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random delay between min and max milliseconds.
 *
 * @param minMs - Minimum milliseconds
 * @param maxMs - Maximum milliseconds
 * @returns Random delay in milliseconds
 */
export function randomDelay(minMs: number = 2000, maxMs: number = 7000): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Pause for a random delay between min and max.
 *
 * @param minMs - Minimum milliseconds
 * @param maxMs - Maximum milliseconds
 */
export async function randomPause(minMs: number = 2000, maxMs: number = 7000): Promise<void> {
  const delay = randomDelay(minMs, maxMs);
  await pause(delay);
}

// ============================================================================
// HTTP CLIENT FACTORY
// ============================================================================

/**
 * Create a cloudscraper client for handling Cloudflare protection.
 *
 * @returns Cloudscraper session
 */
export async function createCloudscraperClient(): Promise<CloudscraperClient> {
  const cloudscraper = await import('cloudscraper');
  const client = (cloudscraper.default || cloudscraper) as unknown as CloudscraperClient['client'];
  return {
    type: 'cloudscraper',
    client,
  };
}

/**
 * Create a puppeteer client with stealth (Tier 2).
 *
 * @returns Puppeteer browser and page
 */
export async function createPuppeteerClient(): Promise<PuppeteerClient> {
  try {
    // Dynamic import with type assertions for optional dependencies
    // Using unknown first to avoid type inference issues with puppeteer-extra
    const puppeteerExtraModule = await import('puppeteer-extra');
    const stealthModule = await import('puppeteer-extra-plugin-stealth');

    // Type the modules explicitly
    const puppeteer = puppeteerExtraModule.default as unknown as {
      use: (plugin: unknown) => void;
      launch: (options: { headless?: boolean | string; args?: string[] }) => Promise<{
        newPage: () => Promise<{
          setUserAgent: (ua: string) => Promise<void>;
          goto: (url: string, options?: { waitUntil?: string }) => Promise<unknown>;
          content: () => Promise<string>;
          type: (selector: string, text: string) => Promise<void>;
          click: (selector: string) => Promise<void>;
          waitForNavigation: (options?: { waitUntil?: string }) => Promise<unknown>;
        }>;
        close: () => Promise<void>;
      }>;
    };
    const stealth = stealthModule.default as unknown as () => unknown;

    puppeteer.use(stealth());

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(DEFAULT_HEADERS['User-Agent'] ?? '');

    return {
      type: 'puppeteer',
      browser: browser as unknown as PuppeteerClient['browser'],
      page: page as unknown as PuppeteerClient['page'],
      close: async () => await browser.close(),
    };
  } catch (e) {
    const error = e as Error;
    throw new Error(`Puppeteer not available: ${error.message}. Install puppeteer-extra and puppeteer-extra-plugin-stealth.`);
  }
}

// ============================================================================
// SPINNER / PROGRESS
// ============================================================================

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Create a simple CLI spinner.
 *
 * @param message - Message to display
 * @returns Spinner controls
 */
export function createSpinner(message: string): SpinnerControl {
  let currentMessage = message;
  let frameIndex = 0;
  let interval: ReturnType<typeof setInterval> | null = null;

  const update = (newMessage?: string): void => {
    currentMessage = newMessage ?? currentMessage;
  };

  const start = (): void => {
    interval = setInterval(() => {
      const frame = spinnerFrames[frameIndex];
      process.stdout.write(`\r${frame} ${currentMessage}`);
      frameIndex = (frameIndex + 1) % spinnerFrames.length;
    }, 80);
  };

  const stop = (finalMessage?: string, success: boolean = true): void => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    const symbol = success ? '✓' : '✗';
    process.stdout.write(`\r${symbol} ${finalMessage ?? currentMessage}\n`);
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
 * @param startYear - Start year
 * @param endYear - End year
 * @returns Array of years
 */
export function generateYearRange(startYear: number, endYear: number): number[] {
  const years: number[] = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  return years;
}

/**
 * Generate an array of dates from start to end (inclusive).
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of date strings
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0] ?? '');
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Get the NCAAM season start date (November 1 of previous year).
 *
 * @param season - Season year (e.g., 2025)
 * @returns Start date (YYYY-MM-DD)
 */
export function ncaamStartDate(season: number): string {
  return `${season - 1}-11-01`;
}

/**
 * Get the NCAAM season end date (April 30).
 *
 * @param season - Season year (e.g., 2025)
 * @returns End date (YYYY-MM-DD)
 */
export function ncaamEndDate(season: number): string {
  return `${season}-04-30`;
}
