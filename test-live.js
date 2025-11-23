/**
 * Live test script for KenPom API
 */

import { KenpomAPI } from './api.js';
import { randomPause } from './utils.js';

async function main() {
  const api = new KenpomAPI({ logLevel: 'INFO' });

  try {
    console.log('='.repeat(60));
    console.log('KenPom API Live Test');
    console.log('='.repeat(60));

    // Login
    console.log('\n1. Logging in...');
    await api.login();
    console.log('✓ Login successful\n');

    // Test getPomeroyRatings
    console.log('2. Fetching Pomeroy Ratings (2025)...');
    const ratings = await api.getPomeroyRatings(2025);
    console.log(`✓ Got ${ratings.length} teams`);
    console.log('Top 5:');
    ratings.slice(0, 5).forEach(t => {
      console.log(`   ${t.Rk}. ${t.Team} (${t.Conf}) - AdjEM: ${t.AdjEM}, Seed: ${t.Seed || 'N/A'}`);
    });

    await randomPause(2000, 4000);

    // Test getEfficiency
    console.log('\n3. Fetching Efficiency Stats (2025)...');
    const efficiency = await api.getEfficiency(2025);
    console.log(`✓ Got ${efficiency.length} teams`);
    console.log('Sample:', JSON.stringify(efficiency[0], null, 2).slice(0, 200) + '...');

    await randomPause(2000, 4000);

    // Test getSchedule
    console.log('\n4. Fetching Duke Schedule (2025)...');
    const schedule = await api.getSchedule('Duke', 2025);
    console.log(`✓ Got ${schedule.length} games`);
    console.log('Last 3 games:');
    schedule.slice(-3).forEach(g => {
      console.log(`   ${g.Date}: vs ${g['Opponent Name']} - ${g.Result}`);
    });

    await randomPause(2000, 4000);

    // Test getScoutingReport
    console.log('\n5. Fetching Duke Scouting Report (2025)...');
    const scouting = await api.getScoutingReport('Duke', 2025);
    console.log('✓ Got scouting report');
    console.log(`   OE: ${scouting.OE} (Rank: ${scouting['OE.Rank']})`);
    console.log(`   DE: ${scouting.DE} (Rank: ${scouting['DE.Rank']})`);
    console.log(`   Tempo: ${scouting.Tempo} (Rank: ${scouting['Tempo.Rank']})`);
    console.log(`   eFG: ${scouting.eFG} (Rank: ${scouting['eFG.Rank']})`);

    await randomPause(2000, 4000);

    // Test getConferenceStandings
    console.log('\n6. Fetching ACC Standings (2025)...');
    const standings = await api.getConferenceStandings('ACC', 2025);
    console.log(`✓ Got ${standings.length} teams`);
    console.log('Top 5:');
    standings.slice(0, 5).forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.Team}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✓ All tests passed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await api.close();
  }
}

main();
