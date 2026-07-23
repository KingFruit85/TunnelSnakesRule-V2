// scripts/verify-data-layer.js
//
// Integration test for the rewritten data-access layer (src/app/lib/db/*).
// Unlike verify-schema.js (raw SQL against the schema), this calls the
// actual exported TypeScript functions, so it catches regressions in the
// resolution/branching logic itself, not just the tables underneath it.
//
// Since ts-node/tsx aren't installed in this project, this compiles the db
// modules with tsc to a scratch directory first, then requires the emitted
// JS directly from plain Node.
//
// Two runtime wrinkles the compile-and-require approach has to work around:
//
//   1. These files use the "@/..." path alias (see tsconfig.json's `paths`).
//      tsc only honors `paths` for type-checking, not for rewriting the
//      emitted `require("@/db/client")` calls into real paths - so at
//      runtime Node has no idea what "@/db/client" means. We patch
//      Module._resolveFilename to redirect any "@/x" request to the
//      compiled OUT_DIR/x.js.
//
//   2. Every file in src/app/lib/db/* imports the "server-only" marker
//      package, which unconditionally throws when required outside of
//      Next.js's react-server bundling condition (it doesn't check for a
//      browser `window` - it throws unless the special "react-server"
//      export condition selected `empty.js` instead of `index.js`, and a
//      plain `node script.js` invocation never sets that condition). We
//      redirect requests for "server-only" to a harmless stub module.
//
// Auth-gated write paths: addNewClub, addPlayerToClub, declineAccessRequest,
// requestAccessToClub, addNewGameSession, endSession, and recordPlayResults
// all call Clerk's auth() internally, which requires a real Next.js
// request/middleware context and throws when called from a standalone Node
// script. So this script never calls those seven functions directly -
// instead it inserts the fixture rows they would have written straight
// via Drizzle, then verifies the *read* functions return correct results
// against that fixture data. The auth checks and recordPlayResults's
// write-side branching get real coverage in Task 13's manual browser
// verification instead.
//
// Every function in src/app/lib/db/* uses the single module-level `db`
// client from src/db/client.ts internally - none of them accept an
// external transaction handle. That means a wrapping
// db.transaction(async (tx) => { ...calls into players.ts... }) at the
// script level would NOT actually roll those calls back, since they'd run
// against the module's own `db`, not the `tx` passed into the callback.
// So this script performs real inserts against the live database and
// cleans them up with explicit deletes afterward, in reverse dependency
// order, inside a try/finally so a thrown assertion still triggers
// cleanup of everything created up to that point.

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const Module = require('module');

const OUT_DIR = path.join(__dirname, '..', '.verify-data-layer-out');
const TSCONFIG_PATH = path.join(__dirname, '..', 'tsconfig.verify-data-layer.json');
const SERVER_ONLY_STUB_PATH = path.join(__dirname, '..', '.verify-data-layer-server-only-stub.js');

// Marker prefix for every fixture row this script creates, so a stray
// failure to clean up is easy to spot (and query for) by eye.
const MARKER = 'verify-layer';

function compile() {
  fs.writeFileSync(SERVER_ONLY_STUB_PATH, 'module.exports = {};\n');

  const tsconfig = {
    extends: './tsconfig.json',
    compilerOptions: {
      outDir: path.relative(path.join(__dirname, '..'), OUT_DIR),
      module: 'commonjs',
      moduleResolution: 'node',
      target: 'es2020',
      esModuleInterop: true,
      skipLibCheck: true,
      resolveJsonModule: true,
      noEmit: false,
      isolatedModules: false,
    },
    include: [
      'src/db/schema.ts',
      'src/db/client.ts',
      'src/app/lib/db/rules.ts',
      'src/app/lib/db/players.ts',
      'src/app/lib/db/clubs.ts',
      'src/app/lib/db/games.ts',
      'src/app/lib/db/games-actions.ts',
      'src/app/lib/db/sessions.ts',
      'src/app/lib/db/results.ts',
      'src/app/lib/db/stats.ts',
      'src/app/lib/definitions.ts',
    ],
  };
  fs.writeFileSync(TSCONFIG_PATH, JSON.stringify(tsconfig, null, 2));

  execFileSync('npx', ['tsc', '-p', TSCONFIG_PATH], { stdio: 'inherit' });

  // Patch Node's module resolution so the emitted `require("@/x")` and
  // `require("server-only")` calls resolve to something real. See the
  // header comment above for why both of these are necessary.
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (request === 'server-only') {
      return SERVER_ONLY_STUB_PATH;
    }
    if (request.startsWith('@/')) {
      return path.join(OUT_DIR, request.slice(2) + '.js');
    }
    return originalResolveFilename.call(this, request, ...rest);
  };
}

function cleanupBuildArtifacts() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.rmSync(TSCONFIG_PATH, { force: true });
  fs.rmSync(SERVER_ONLY_STUB_PATH, { force: true });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`
    );
  }
}

function assertSameSet(actualArray, expectedArray, message) {
  const a = [...actualArray].sort();
  const e = [...expectedArray].sort();
  assert(
    a.length === e.length && a.every((v, i) => v === e[i]),
    `${message} (expected set ${JSON.stringify(e)}, got ${JSON.stringify(a)})`
  );
}

async function main() {
  compile();

  const players = require(path.join(OUT_DIR, 'app/lib/db/players.js'));
  const clubs = require(path.join(OUT_DIR, 'app/lib/db/clubs.js'));
  const games = require(path.join(OUT_DIR, 'app/lib/db/games.js'));
  // addNewBoardGame lives in games-actions.ts, not games.ts - split out
  // after the "use server" module-boundary fix (a per-function "use server"
  // inside a file that also `import "server-only"`s and is reachable from
  // client code doesn't work; see the header comment in
  // src/app/lib/db/players.ts for the full story).
  const gamesActions = require(path.join(OUT_DIR, 'app/lib/db/games-actions.js'));
  const rules = require(path.join(OUT_DIR, 'app/lib/db/rules.js'));
  const sessionsLib = require(path.join(OUT_DIR, 'app/lib/db/sessions.js'));
  const results = require(path.join(OUT_DIR, 'app/lib/db/results.js'));
  const stats = require(path.join(OUT_DIR, 'app/lib/db/stats.js'));
  const { db } = require(path.join(OUT_DIR, 'db/client.js'));
  const schema = require(path.join(OUT_DIR, 'db/schema.js'));
  const { inArray, and, eq } = require('drizzle-orm');

  // Tracks every fixture id created so far, so the finally block can clean
  // up everything created up to whatever point an assertion throws at -
  // not just what a happy-path cleanup block would cover.
  const fixtures = {
    playerIds: [],
    clubIds: [],
    gameIds: [],
    sessionIds: [],
    playIds: [],
  };

  try {
    // ------------------------------------------------------------------
    // 1. players.ts round-trip.
    //    NOTE: the plan's amendment says addNewPlayer is the one write
    //    function in this file that doesn't call auth(), so it should be
    //    callable directly like the original Step-1 example does. That's
    //    stale as of commit ed327ba ("fix(security): require auth +
    //    club-owner check on membership mutations"), which added an
    //    auth() gate to addNewPlayer too, in addition to the seven
    //    functions the amendment explicitly lists - confirmed by actually
    //    running it here and getting Clerk's "auth() ... only supported
    //    in App Router" error. Applying the amendment's own stated
    //    principle for auth-gated writes (fixture-insert via Drizzle,
    //    then verify the read function), rather than the literal example.
    // ------------------------------------------------------------------
    const [insertedPlayer] = await db
      .insert(schema.players)
      .values({ externalId: `${MARKER}-round-trip`, name: `${MARKER}-Verify Layer Bot` })
      .returning();
    fixtures.playerIds.push(insertedPlayer.id);

    const player = await players.getPlayerById(insertedPlayer.id);
    assertEqual(player.name, `${MARKER}-Verify Layer Bot`, 'getPlayerById mismatch');
    console.log('players.ts round-trip OK (addNewPlayer is auth-gated as of ed327ba; fixture-inserted instead)');

    // ------------------------------------------------------------------
    // 2. clubs.ts - fixture-insert-then-verify-reads (addNewClub is
    //    auth-gated, so the club/membership rows are inserted directly).
    // ------------------------------------------------------------------
    const [ownerPlayer] = await db
      .insert(schema.players)
      .values({ externalId: `${MARKER}-owner`, name: `${MARKER}-Owner` })
      .returning();
    const [memberPlayer] = await db
      .insert(schema.players)
      .values({ externalId: `${MARKER}-member`, name: `${MARKER}-Member` })
      .returning();
    const [otherPlayer] = await db
      .insert(schema.players)
      .values({ externalId: `${MARKER}-other`, name: `${MARKER}-Other` })
      .returning();
    fixtures.playerIds.push(ownerPlayer.id, memberPlayer.id, otherPlayer.id);

    const [club] = await db
      .insert(schema.clubs)
      .values({ name: `${MARKER}-Club`, ownerId: ownerPlayer.id })
      .returning();
    fixtures.clubIds.push(club.id);

    await db.insert(schema.clubMembers).values([
      { playerId: ownerPlayer.id, clubId: club.id },
      { playerId: memberPlayer.id, clubId: club.id },
    ]);
    // otherPlayer is deliberately NOT a club member - it's used below to
    // prove getAllPlayersBySessionId's historical roster differs from
    // getAllPlayersInClub's record-time roster.

    const clubDetails = await clubs.getClubDetails(club.id);
    assertEqual(clubDetails.name, `${MARKER}-Club`, 'getClubDetails mismatch');

    assertEqual(
      await clubs.checkIfPlayerIsClubOwner(club.id, ownerPlayer.externalId),
      true,
      'checkIfPlayerIsClubOwner should be true for the owner'
    );
    assertEqual(
      await clubs.checkIfPlayerIsClubOwner(club.id, memberPlayer.externalId),
      false,
      'checkIfPlayerIsClubOwner should be false for a non-owner member'
    );

    const ownersClubs = await clubs.getUsersClubs(ownerPlayer.externalId);
    assert(
      ownersClubs.some((c) => c.id === club.id),
      'getUsersClubs should include the fixture club for its owner'
    );

    const clubsOtherIsNotIn = await clubs.getClubsPlayerIsNotAMemberOf(otherPlayer.externalId);
    assert(
      clubsOtherIsNotIn.some((c) => c.id === club.id),
      'getClubsPlayerIsNotAMemberOf should include the fixture club for a non-member'
    );
    const clubsMemberIsNotIn = await clubs.getClubsPlayerIsNotAMemberOf(memberPlayer.externalId);
    assert(
      !clubsMemberIsNotIn.some((c) => c.id === club.id),
      'getClubsPlayerIsNotAMemberOf should exclude the fixture club for an existing member'
    );
    console.log('clubs.ts reads OK');

    // ------------------------------------------------------------------
    // 3. games.ts / rules.ts - resolveEffectiveRules's variant-vs-default
    //    resolution, plus getAllBoardgames/getBoardgameById.
    // ------------------------------------------------------------------
    const [gameBase] = await db
      .insert(schema.games)
      .values({ name: `${MARKER}-Base Game`, winCondition: 'single_winner', scoringDirection: null })
      .returning();
    const [gameVariant] = await db
      .insert(schema.games)
      .values({ name: `${MARKER}-Variant Game`, winCondition: 'single_winner', scoringDirection: null })
      .returning();
    const [gameLeaderboard] = await db
      .insert(schema.games)
      .values({ name: `${MARKER}-Leaderboard Game`, winCondition: 'leaderboard', scoringDirection: 'high' })
      .returning();
    fixtures.gameIds.push(gameBase.id, gameVariant.id, gameLeaderboard.id);

    await db.insert(schema.clubGameVariants).values({
      clubId: club.id,
      gameId: gameVariant.id,
      winCondition: 'leaderboard',
      scoringDirection: 'high',
    });

    const baseRules = await rules.resolveEffectiveRules(club.id, gameBase.id);
    assertEqual(baseRules.winCondition, 'single_winner', 'resolveEffectiveRules should fall back to the base game when no variant exists');
    assertEqual(baseRules.scoringDirection, null, 'resolveEffectiveRules base scoringDirection mismatch');

    const variantRules = await rules.resolveEffectiveRules(club.id, gameVariant.id);
    assertEqual(variantRules.winCondition, 'leaderboard', 'resolveEffectiveRules should prefer the club_game_variants override');
    assertEqual(variantRules.scoringDirection, 'high', 'resolveEffectiveRules override scoringDirection mismatch');

    const boardgames = await games.getAllBoardgames(club.id);
    const variantEntry = boardgames.find((g) => g.id === gameVariant.id);
    const baseEntry = boardgames.find((g) => g.id === gameBase.id);
    assert(variantEntry && variantEntry.hasVariant === true, 'getAllBoardgames should flag the overridden game as hasVariant');
    assert(baseEntry && baseEntry.hasVariant === false, 'getAllBoardgames should not flag the non-overridden game as hasVariant');

    const fetchedBaseGame = await games.getBoardgameById(gameBase.id);
    assertEqual(fetchedBaseGame.name, `${MARKER}-Base Game`, 'getBoardgameById mismatch');
    console.log('games.ts / rules.ts reads OK (resolveEffectiveRules variant-vs-default)');

    // ------------------------------------------------------------------
    // 3b. games.ts - addNewBoardGame's real write path, called directly.
    //    Unlike the seven functions listed in the plan's amendment, this
    //    one does not call auth() (confirmed by reading games.ts), so it
    //    can be exercised for real rather than simulated via a fixture
    //    insert. It does call next/navigation's redirect() at the end,
    //    which throws a plain Error with a "NEXT_REDIRECT;..." digest and
    //    needs no request context to throw - so that's expected control
    //    flow to catch, not a real failure.
    // ------------------------------------------------------------------
    async function callAddNewBoardGame(formEntries) {
      const formData = new FormData();
      for (const [key, value] of Object.entries(formEntries)) {
        formData.set(key, value);
      }
      try {
        await gamesActions.addNewBoardGame(formData);
      } catch (err) {
        if (!(err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT'))) {
          throw err;
        }
      }
    }

    // New name -> becomes the new global default (no variant row).
    const newGameName = `${MARKER}-New Game`;
    await callAddNewBoardGame({
      gameName: newGameName,
      winCondition: '3', // single_winner, per games.ts's WIN_CONDITION_UI_TO_DB
      clubId: club.id,
      scoringDirection: '',
    });
    const [insertedNewGame] = await db.select().from(schema.games).where(eq(schema.games.name, newGameName));
    assert(insertedNewGame, 'addNewBoardGame should insert a new games row for a name that does not exist yet');
    assertEqual(insertedNewGame.winCondition, 'single_winner', 'addNewBoardGame new-game winCondition mismatch');
    fixtures.gameIds.push(insertedNewGame.id);

    // Same name again, different rules, from the same club -> creates a
    // club_game_variants override rather than mutating the global default.
    await callAddNewBoardGame({
      gameName: newGameName,
      winCondition: '0', // leaderboard
      clubId: club.id,
      scoringDirection: 'High',
    });
    const [unchangedGlobalGame] = await db.select().from(schema.games).where(eq(schema.games.id, insertedNewGame.id));
    assertEqual(unchangedGlobalGame.winCondition, 'single_winner', 'addNewBoardGame should not mutate the global default when a club submits different rules');
    const [createdVariant] = await db
      .select()
      .from(schema.clubGameVariants)
      .where(
        and(
          eq(schema.clubGameVariants.clubId, club.id),
          eq(schema.clubGameVariants.gameId, insertedNewGame.id)
        )
      );
    assert(createdVariant, 'addNewBoardGame should create a club_game_variants row when the club submits different rules for an existing name');
    assertEqual(createdVariant.winCondition, 'leaderboard', 'addNewBoardGame variant winCondition mismatch');
    console.log('games.ts addNewBoardGame write path OK (new-game insert + variant creation)');

    // ------------------------------------------------------------------
    // 4. sessions.ts - both roster functions.
    //    getAllPlayersInClub reads club_members fixtures (record-time
    //    roster: owner + member). getAllPlayersBySessionId is derived
    //    from result-table fixtures under this session's plays
    //    (historical roster: member + other, set up in step 5 below).
    // ------------------------------------------------------------------
    const [session] = await db
      .insert(schema.sessions)
      .values({ clubId: club.id, name: `${MARKER}-Session`, date: new Date(), active: true })
      .returning();
    fixtures.sessionIds.push(session.id);

    const clubRoster = await sessionsLib.getAllPlayersInClub(club.id);
    assertSameSet(
      clubRoster.map((p) => p.id),
      [ownerPlayer.id, memberPlayer.id],
      'getAllPlayersInClub should return exactly the club_members fixture rows'
    );
    console.log('sessions.ts getAllPlayersInClub OK');

    // ------------------------------------------------------------------
    // 5. results.ts - getEventWinner's three-way fallback (team -> outcome
    //    -> leaderboard), one play per branch so each is exercised in
    //    isolation, plus getAllPlayersBySessionId derived from all three.
    // ------------------------------------------------------------------
    const [playOutcome] = await db
      .insert(schema.plays)
      .values({ sessionId: session.id, gameId: gameBase.id })
      .returning();
    const [playLeaderboard] = await db
      .insert(schema.plays)
      .values({ sessionId: session.id, gameId: gameLeaderboard.id })
      .returning();
    const [playTeamTied] = await db
      .insert(schema.plays)
      .values({ sessionId: session.id, gameId: gameBase.id })
      .returning();
    fixtures.playIds.push(playOutcome.id, playLeaderboard.id, playTeamTied.id);

    // outcome_results fallback: memberPlayer wins, otherPlayer loses.
    await db.insert(schema.outcomeResults).values([
      { playId: playOutcome.id, playerId: memberPlayer.id, won: true },
      { playId: playOutcome.id, playerId: otherPlayer.id, won: false },
    ]);
    const outcomeWinner = await results.getEventWinner(playOutcome.id);
    assertEqual(outcomeWinner.winner, memberPlayer.name, 'getEventWinner outcome-results fallback should name the winning player');

    // leaderboard_results fallback: high scoring direction, otherPlayer
    // has the higher score and should win.
    await db.insert(schema.leaderboardResults).values([
      { playId: playLeaderboard.id, playerId: memberPlayer.id, score: 10 },
      { playId: playLeaderboard.id, playerId: otherPlayer.id, score: 20 },
    ]);
    const leaderboardWinner = await results.getEventWinner(playLeaderboard.id);
    assertEqual(leaderboardWinner.winner, otherPlayer.name, 'getEventWinner leaderboard-results fallback should name the highest scorer');

    // team_results tie: every row won: false -> "Tied".
    await db.insert(schema.teamResults).values([
      { playId: playTeamTied.id, playerId: memberPlayer.id, team: 'Red', won: false },
      { playId: playTeamTied.id, playerId: otherPlayer.id, team: 'Blue', won: false },
    ]);
    const teamWinner = await results.getEventWinner(playTeamTied.id);
    assertEqual(teamWinner.winner, 'Tied', 'getEventWinner should return "Tied" when no team_results row has won: true');
    console.log('results.ts getEventWinner three-way fallback OK');

    const sessionRoster = await sessionsLib.getAllPlayersBySessionId(session.id);
    assertSameSet(
      sessionRoster.map((p) => p.id),
      [memberPlayer.id, otherPlayer.id],
      'getAllPlayersBySessionId should return exactly the players appearing in result-table fixtures for this session'
    );
    console.log('sessions.ts getAllPlayersBySessionId OK');

    // ------------------------------------------------------------------
    // 6. stats.ts - getClubStats. Reuses club/session fixtures from steps
    //    2 and 4 above; adds a fourth member (fourthPlayer) who never
    //    plays, to prove the leaderboard excludes zero-played members.
    // ------------------------------------------------------------------
    const [fourthPlayer] = await db
      .insert(schema.players)
      .values({ externalId: `${MARKER}-fourth`, name: `${MARKER}-Fourth` })
      .returning();
    fixtures.playerIds.push(fourthPlayer.id);
    await db.insert(schema.clubMembers).values({ playerId: fourthPlayer.id, clubId: club.id });

    const [gameSingleLoser] = await db
      .insert(schema.games)
      .values({ name: `${MARKER}-Single Loser Game`, winCondition: 'single_loser', scoringDirection: null })
      .returning();
    fixtures.gameIds.push(gameSingleLoser.id);

    const [statsSession] = await db
      .insert(schema.sessions)
      .values({ clubId: club.id, name: `${MARKER}-Stats Session`, date: new Date(), active: true })
      .returning();
    fixtures.sessionIds.push(statsSession.id);

    // Leaderboard play: high score wins. otherPlayer scores highest (20) so
    // otherPlayer should get the win; memberPlayer and ownerPlayer both played
    // but didn't win.
    const [statsPlayLeaderboard] = await db
      .insert(schema.plays)
      .values({ sessionId: statsSession.id, gameId: gameLeaderboard.id })
      .returning();
    fixtures.playIds.push(statsPlayLeaderboard.id);
    await db.insert(schema.leaderboardResults).values([
      { playId: statsPlayLeaderboard.id, playerId: ownerPlayer.id, score: 5 },
      { playId: statsPlayLeaderboard.id, playerId: memberPlayer.id, score: 10 },
      { playId: statsPlayLeaderboard.id, playerId: otherPlayer.id, score: 20 },
    ]);

    // Single-loser play: outcomeResults already encodes "won" per player at
    // write time (see writeResultRows) - otherPlayer is the loser (won:
    // false), ownerPlayer and memberPlayer both "won" (won: true).
    const [statsPlaySingleLoser] = await db
      .insert(schema.plays)
      .values({ sessionId: statsSession.id, gameId: gameSingleLoser.id })
      .returning();
    fixtures.playIds.push(statsPlaySingleLoser.id);
    await db.insert(schema.outcomeResults).values([
      { playId: statsPlaySingleLoser.id, playerId: ownerPlayer.id, won: true },
      { playId: statsPlaySingleLoser.id, playerId: memberPlayer.id, won: true },
      { playId: statsPlaySingleLoser.id, playerId: otherPlayer.id, won: false },
    ]);

    const clubStats = await stats.getClubStats(club.id);
    assertEqual(clubStats.sessionCount, 2, 'getClubStats sessionCount should count both fixture sessions for this club');
    assertEqual(clubStats.resultCount, 5, 'getClubStats resultCount should count every play across both sessions (3 from step 5 + 2 here)');

    // otherPlayer is deliberately NOT a club_members row (see section 2's
    // comment above) despite having the most wins and the most plays of anyone -
    // getAllPlayersInClub only returns current members, so the tally map
    // never has an entry for otherPlayer, and they must not appear here no
    // matter how many plays/wins their result rows show.
    assert(
      !clubStats.leaderboard.some((r) => r.playerId === otherPlayer.id),
      'getClubStats leaderboard should exclude otherPlayer, who is not a club member'
    );

    // ownerPlayer only appears in this task's two new plays: statsPlayLeaderboard
    // (played, didn't win - otherPlayer's score of 20 beats their 5) and
    // statsPlaySingleLoser (played, won: true). played:2, wins:1.
    const ownerRow = clubStats.leaderboard.find((r) => r.playerId === ownerPlayer.id);
    assert(ownerRow, 'getClubStats leaderboard should include ownerPlayer');
    assertEqual(ownerRow.played, 2, 'ownerPlayer should show played:2 (both of this task\'s new plays)');
    assertEqual(ownerRow.wins, 1, 'ownerPlayer should have exactly 1 win (the single_loser play, since they were not the loser)');

    // memberPlayer appears in all 5 plays across both sessions: the 3 from
    // step 5 (playOutcome: won; playLeaderboard: played, lost to otherPlayer's
    // higher score; playTeamTied: played, no winner) plus this task's 2
    // (statsPlayLeaderboard: played, lost; statsPlaySingleLoser: won).
    // played:5, wins:2 (playOutcome + statsPlaySingleLoser).
    const memberRow = clubStats.leaderboard.find((r) => r.playerId === memberPlayer.id);
    assert(memberRow, 'getClubStats leaderboard should include memberPlayer');
    assertEqual(memberRow.played, 5, 'memberPlayer should show played:5 across both sessions');
    assertEqual(memberRow.wins, 2, 'memberPlayer should have exactly 2 wins (playOutcome + statsPlaySingleLoser)');

    assert(
      !clubStats.leaderboard.some((r) => r.playerId === fourthPlayer.id),
      'getClubStats leaderboard should exclude fourthPlayer, who never played'
    );

    assertEqual(clubStats.leaderboard.length, 2, 'getClubStats leaderboard should have exactly 2 rows: memberPlayer and ownerPlayer');
    assertEqual(clubStats.leaderboard[0].playerId, memberPlayer.id, 'getClubStats leaderboard should sort by wins desc, placing memberPlayer (2 wins) before ownerPlayer (1 win)');
    console.log('stats.ts getClubStats OK (leaderboard direction + outcome-based winners + non-member exclusion + wins-desc sort)');
  } finally {
    // Explicit cleanup, not a transaction rollback - see header comment:
    // every db/lib call in this script shares the module-level `db`
    // client, so a db.transaction() wrapper here would not actually roll
    // any of it back. Deletes run in reverse dependency order, and this
    // block runs even if an assertion above threw partway through, so it
    // only ever deletes ids that were actually recorded in `fixtures`.
    if (fixtures.playIds.length > 0) {
      await db.delete(schema.outcomeResults).where(inArray(schema.outcomeResults.playId, fixtures.playIds));
      await db.delete(schema.leaderboardResults).where(inArray(schema.leaderboardResults.playId, fixtures.playIds));
      await db.delete(schema.teamResults).where(inArray(schema.teamResults.playId, fixtures.playIds));
      await db.delete(schema.plays).where(inArray(schema.plays.id, fixtures.playIds));
    }
    if (fixtures.sessionIds.length > 0) {
      await db.delete(schema.sessions).where(inArray(schema.sessions.id, fixtures.sessionIds));
    }
    if (fixtures.clubIds.length > 0) {
      await db.delete(schema.clubGameVariants).where(inArray(schema.clubGameVariants.clubId, fixtures.clubIds));
    }
    if (fixtures.gameIds.length > 0) {
      await db.delete(schema.games).where(inArray(schema.games.id, fixtures.gameIds));
    }
    if (fixtures.clubIds.length > 0) {
      await db.delete(schema.clubMembers).where(inArray(schema.clubMembers.clubId, fixtures.clubIds));
      await db.delete(schema.clubs).where(inArray(schema.clubs.id, fixtures.clubIds));
    }
    if (fixtures.playerIds.length > 0) {
      await db.delete(schema.players).where(inArray(schema.players.id, fixtures.playerIds));
    }
  }

  cleanupBuildArtifacts();
  console.log('Data-access layer verification passed.');
}

main().catch((err) => {
  console.error('Data-access layer verification failed:', err);
  cleanupBuildArtifacts();
  process.exit(1);
});
