const { db } = require('@vercel/postgres');
const { v4: uuidv4 } = require('uuid');

async function main() {
  const client = await db.connect();
  try {
    const playerId = uuidv4();
    await client.query(
      `INSERT INTO players (id, external_id, name) VALUES ($1, $2, $3)`,
      [playerId, 'seed-admin', 'Admin']
    );

    const clubId = uuidv4();
    await client.query(
      `INSERT INTO clubs (id, name, owner_id) VALUES ($1, $2, $3)`,
      [clubId, 'Seed Club', playerId]
    );
    await client.query(
      `INSERT INTO club_members (player_id, club_id) VALUES ($1, $2)`,
      [playerId, clubId]
    );

    const catanId = uuidv4();
    await client.query(
      `INSERT INTO games (id, name, win_condition, scoring_direction) VALUES ($1, $2, 'leaderboard', 'high')`,
      [catanId, 'Catan']
    );

    console.log('Seeded: 1 player, 1 club, 1 game.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
