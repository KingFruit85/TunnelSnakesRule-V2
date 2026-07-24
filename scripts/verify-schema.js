const { Client } = require('@neondatabase/serverless');

const LEGACY_TABLES = [
  'players_clubs',
  'joinrequests',
  'boardgames',
  'gameresults',
  'playerscores',
];

const NEW_TABLES = [
  'players',
  'clubs',
  'club_members',
  'join_requests',
  'games',
  'club_game_variants',
  'sessions',
  'plays',
  'leaderboard_results',
  'team_results',
  'outcome_results',
];

async function getPublicTableNames(client) {
  const result = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  return result.rows.map((row) => row.table_name);
}

async function checkTables(client) {
  const tableNames = await getPublicTableNames(client);

  const stillPresent = LEGACY_TABLES.filter((name) => tableNames.includes(name));
  if (stillPresent.length > 0) {
    throw new Error(`Legacy tables still present: ${stillPresent.join(', ')}`);
  }

  const missing = NEW_TABLES.filter((name) => !tableNames.includes(name));
  if (missing.length > 0) {
    throw new Error(`New tables missing: ${missing.join(', ')}`);
  }

  console.log(`All ${NEW_TABLES.length} new tables present; all ${LEGACY_TABLES.length} legacy tables gone.`);
}

async function checkRoundTripAndConstraints(client) {
  await client.query('BEGIN');
  try {
    const player = await client.query(
      `INSERT INTO players (external_id, name) VALUES ('verify-schema-test-user', 'Verify Bot') RETURNING id`
    );
    const playerId = player.rows[0].id;

    const club = await client.query(
      `INSERT INTO clubs (name, owner_id) VALUES ('Verify Schema Club', $1) RETURNING id, avatar`,
      [playerId]
    );
    const clubId = club.rows[0].id;
    if (club.rows[0].avatar !== null) {
      throw new Error(`Expected clubs.avatar to default to null, got ${JSON.stringify(club.rows[0].avatar)}`);
    }

    await client.query(`UPDATE clubs SET avatar = 'https://example.com/photo.jpg' WHERE id = $1`, [clubId]);
    const updated = await client.query(`SELECT avatar FROM clubs WHERE id = $1`, [clubId]);
    if (updated.rows[0].avatar !== 'https://example.com/photo.jpg') {
      throw new Error('clubs.avatar did not round-trip a written value');
    }
    console.log('clubs.avatar column present, nullable, and round-trips correctly.');

    await client.query(
      `INSERT INTO club_members (player_id, club_id) VALUES ($1, $2)`,
      [playerId, clubId]
    );

    const game = await client.query(
      `INSERT INTO games (name, win_condition, scoring_direction) VALUES ('Verify Game', 'leaderboard', 'high') RETURNING id`
    );
    const gameId = game.rows[0].id;

    const session = await client.query(
      `INSERT INTO sessions (club_id, name, date, active) VALUES ($1, 'Verify Session', now(), true) RETURNING id`,
      [clubId]
    );
    const sessionId = session.rows[0].id;

    const play = await client.query(
      `INSERT INTO plays (session_id, game_id) VALUES ($1, $2) RETURNING id`,
      [sessionId, gameId]
    );
    const playId = play.rows[0].id;

    await client.query(
      `INSERT INTO leaderboard_results (play_id, player_id, score) VALUES ($1, $2, 42)`,
      [playId, playerId]
    );

    console.log('Round-trip insert across players -> clubs -> club_members -> games -> sessions -> plays -> leaderboard_results succeeded.');

    // Postgres marks a transaction aborted after any statement error, so each constraint-violation test
    // that's expected to fail needs a SAVEPOINT beforehand and a ROLLBACK TO after, to keep the
    // transaction usable for subsequent statements in the same test run.
    await client.query('SAVEPOINT sp_scoring_direction');
    let checkConstraintFired = false;
    try {
      await client.query(
        `INSERT INTO games (name, win_condition, scoring_direction) VALUES ('Bad Game', 'cooperative', 'high')`
      );
    } catch (err) {
      checkConstraintFired = /scoring_direction_matches_win_condition/.test(err.message);
    }
    await client.query('ROLLBACK TO sp_scoring_direction');
    if (!checkConstraintFired) {
      throw new Error('Expected the scoring_direction/win_condition CHECK constraint to reject a cooperative game with a scoring_direction set, but it did not.');
    }
    console.log('CHECK constraint correctly rejected an invalid win_condition/scoring_direction combination.');

    const hiddenTraitorGame = await client.query(
      `INSERT INTO games (name, win_condition, role_one_label, role_two_label, neither_label)
       VALUES ('Verify Hidden Traitor Game', 'hidden_traitor', 'Heroes', 'Traitor', 'The house wins')
       RETURNING id, role_one_label, role_two_label, neither_label`
    );
    if (
      hiddenTraitorGame.rows[0].role_one_label !== 'Heroes' ||
      hiddenTraitorGame.rows[0].role_two_label !== 'Traitor' ||
      hiddenTraitorGame.rows[0].neither_label !== 'The house wins'
    ) {
      throw new Error('hidden_traitor role/neither labels did not round-trip correctly');
    }
    console.log('hidden_traitor game round-trips role_one_label/role_two_label/neither_label correctly.');

    await client.query('SAVEPOINT sp_hidden_traitor_1');
    let hiddenTraitorMissingLabelRejected = false;
    try {
      await client.query(
        `INSERT INTO games (name, win_condition, role_one_label, role_two_label)
         VALUES ('Bad Hidden Traitor Game', 'hidden_traitor', 'Heroes', 'Traitor')`
      );
    } catch (err) {
      hiddenTraitorMissingLabelRejected = /hidden_traitor_labels_required/.test(err.message);
    }
    await client.query('ROLLBACK TO sp_hidden_traitor_1');
    if (!hiddenTraitorMissingLabelRejected) {
      throw new Error('Expected the hidden_traitor labels CHECK constraint to reject a hidden_traitor game missing neither_label, but it did not.');
    }
    console.log('CHECK constraint correctly rejected a hidden_traitor game missing a required label.');

    await client.query('SAVEPOINT sp_hidden_traitor_2');
    let nonHiddenTraitorLabelRejected = false;
    try {
      await client.query(
        `INSERT INTO games (name, win_condition, role_one_label)
         VALUES ('Bad Cooperative Game', 'cooperative', 'Heroes')`
      );
    } catch (err) {
      nonHiddenTraitorLabelRejected = /hidden_traitor_labels_required/.test(err.message);
    }
    await client.query('ROLLBACK TO sp_hidden_traitor_2');
    if (!nonHiddenTraitorLabelRejected) {
      throw new Error('Expected the hidden_traitor labels CHECK constraint to reject a non-hidden_traitor game with a role label set, but it did not.');
    }
    console.log('CHECK constraint correctly rejected a non-hidden_traitor game with a stray role label set.');
  } finally {
    // Roll back so this script never leaves data behind, matching the wiped state it found.
    await client.query('ROLLBACK');
  }
}

async function main() {
  const client = new Client(process.env.STORAGE_DATABASE_URL_UNPOOLED);
  await client.connect();
  try {
    await checkTables(client);
    await checkRoundTripAndConstraints(client);
    console.log('Schema verification passed.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Schema verification failed:', err);
  process.exit(1);
});
