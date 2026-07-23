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
// requestAccessToClub, addNewGameSession, endSession, recordPlayResults, and
// addNewBoardGame all call Clerk's auth() internally, which requires a real
// Next.js request/middleware context and throws when called from a
// standalone Node script. So this script never calls those eight functions
// directly - instead it inserts the fixture rows they would have written
// straight via Drizzle, then verifies the *read* functions return correct
// results against that fixture data. The auth checks and recordPlayResults's
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
  const rules = require(path.join(OUT_DIR, 'app/lib/db/rules.js'));
  const sessionsLib = require(path.join(OUT_DIR, 'app/lib/db/sessions.js'));
  const results = require(path.join(OUT_DIR, 'app/lib/db/results.js'));
  const stats = require(path.join(OUT_DIR, 'app/lib/db/stats.js'));
  const { db } = require(path.join(OUT_DIR, 'db/client.js'));
  const schema = require(path.join(OUT_DIR, 'db/schema.js'));
  const { inArray } = require('drizzle-orm');

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
    assertEqual(clubStats.playCount, 5, 'getClubStats playCount should count every play across both sessions (3 from step 5 + 2 here)');

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

    // ------------------------------------------------------------------
    // 7. results.ts - getSessionPlaySummaries. One play per win condition,
    //    reusing the club/session fixtures already in scope (club.id,
    //    memberPlayer, ownerPlayer, statsSession from step 6 above), plus
    //    one brand-new session so this section's plays don't interfere
    //    with step 6's own wins/played counts.
    // ------------------------------------------------------------------
    const [summarySession] = await db
      .insert(schema.sessions)
      .values({ clubId: club.id, name: `${MARKER}-Summary Session`, date: new Date(), active: true })
      .returning();
    fixtures.sessionIds.push(summarySession.id);

    const [gameTeamBased] = await db
      .insert(schema.games)
      .values({ name: `${MARKER}-Team Game`, winCondition: 'team_based', scoringDirection: null })
      .returning();
    const [gameCooperative] = await db
      .insert(schema.games)
      .values({ name: `${MARKER}-Co-op Game`, winCondition: 'cooperative', scoringDirection: null })
      .returning();
    const [gameSingleWinner] = await db
      .insert(schema.games)
      .values({ name: `${MARKER}-Single Winner Game`, winCondition: 'single_winner', scoringDirection: null })
      .returning();
    fixtures.gameIds.push(gameTeamBased.id, gameCooperative.id, gameSingleWinner.id);

    // Leaderboard play: low score wins this time (gameLeaderboard from
    // section 3 is 'high' - use a fresh low-scoring game so both directions
    // get exercised across this file's tests).
    const [gameLowScore] = await db
      .insert(schema.games)
      .values({ name: `${MARKER}-Golf Game`, winCondition: 'leaderboard', scoringDirection: 'low' })
      .returning();
    fixtures.gameIds.push(gameLowScore.id);

    const [playLowScoreLeaderboard] = await db
      .insert(schema.plays)
      .values({ sessionId: summarySession.id, gameId: gameLowScore.id, notes: `${MARKER}-house rule` })
      .returning();
    fixtures.playIds.push(playLowScoreLeaderboard.id);
    await db.insert(schema.leaderboardResults).values([
      { playId: playLowScoreLeaderboard.id, playerId: ownerPlayer.id, score: 72 },
      { playId: playLowScoreLeaderboard.id, playerId: memberPlayer.id, score: 68 },
    ]);

    const [playTeam] = await db
      .insert(schema.plays)
      .values({ sessionId: summarySession.id, gameId: gameTeamBased.id })
      .returning();
    fixtures.playIds.push(playTeam.id);
    await db.insert(schema.teamResults).values([
      { playId: playTeam.id, playerId: ownerPlayer.id, team: 'A', won: true },
      { playId: playTeam.id, playerId: memberPlayer.id, team: 'B', won: false },
    ]);

    const [playCoop] = await db
      .insert(schema.plays)
      .values({ sessionId: summarySession.id, gameId: gameCooperative.id })
      .returning();
    fixtures.playIds.push(playCoop.id);
    await db.insert(schema.outcomeResults).values([
      { playId: playCoop.id, playerId: ownerPlayer.id, won: true },
      { playId: playCoop.id, playerId: memberPlayer.id, won: true },
    ]);

    const [playSingleLoser] = await db
      .insert(schema.plays)
      .values({ sessionId: summarySession.id, gameId: gameSingleLoser.id })
      .returning();
    fixtures.playIds.push(playSingleLoser.id);
    await db.insert(schema.outcomeResults).values([
      { playId: playSingleLoser.id, playerId: ownerPlayer.id, won: true },
      { playId: playSingleLoser.id, playerId: memberPlayer.id, won: false },
    ]);

    const [playSingleWinner] = await db
      .insert(schema.plays)
      .values({ sessionId: summarySession.id, gameId: gameSingleWinner.id })
      .returning();
    fixtures.playIds.push(playSingleWinner.id);
    await db.insert(schema.outcomeResults).values([
      { playId: playSingleWinner.id, playerId: ownerPlayer.id, won: true },
      { playId: playSingleWinner.id, playerId: memberPlayer.id, won: false },
    ]);

    const summaries = await results.getSessionPlaySummaries(club.id, summarySession.id);
    assertEqual(summaries.length, 5, 'getSessionPlaySummaries should return one entry per play in this session');

    const leaderboardSummary = summaries.find((s) => s.playId === playLowScoreLeaderboard.id);
    assert(leaderboardSummary, 'missing leaderboard play summary');
    assertEqual(leaderboardSummary.summary, `${memberPlayer.name} won · 68 pts`, 'low-score-wins leaderboard summary should name the lowest scorer');
    assertEqual(leaderboardSummary.detail, `${memberPlayer.name} 68 · ${ownerPlayer.name} 72`, 'leaderboard detail should be sorted low-to-high for a low-wins game');
    assertEqual(leaderboardSummary.notes, `${MARKER}-house rule`, 'leaderboard play notes should pass through unchanged');
    assertEqual(leaderboardSummary.gameName, `${MARKER}-Golf Game`, 'leaderboard play should resolve its game name');

    const teamSummary = summaries.find((s) => s.playId === playTeam.id);
    assert(teamSummary, 'missing team play summary');
    assertEqual(teamSummary.summary, 'Team A won', 'team summary should name the winning team');
    assertEqual(teamSummary.detail, `${ownerPlayer.name} beat ${memberPlayer.name}`, 'team detail should read "winners beat losers"');

    const coopSummary = summaries.find((s) => s.playId === playCoop.id);
    assert(coopSummary, 'missing cooperative play summary');
    assertEqual(coopSummary.summary, 'Everyone won', 'cooperative summary should say Everyone won, not name a player');

    const singleLoserSummary = summaries.find((s) => s.playId === playSingleLoser.id);
    assert(singleLoserSummary, 'missing single_loser play summary');
    assertEqual(singleLoserSummary.summary, `${memberPlayer.name} lost`, 'single_loser summary should name the loser specifically');
    // Built from a plain SELECT with no ORDER BY across 2 rows, so row order
    // isn't guaranteed by SQL semantics - assert membership/shape, not an
    // exact ordering, to avoid a flaky test tied to incidental scan order.
    assert(
      singleLoserSummary.detail.startsWith('Played: ') &&
        singleLoserSummary.detail.includes(ownerPlayer.name) &&
        singleLoserSummary.detail.includes(memberPlayer.name),
      `single_loser detail should list both participants (got ${JSON.stringify(singleLoserSummary.detail)})`
    );

    const singleWinnerSummary = summaries.find((s) => s.playId === playSingleWinner.id);
    assert(singleWinnerSummary, 'missing single_winner play summary');
    assertEqual(singleWinnerSummary.summary, `${ownerPlayer.name} won`, 'single_winner summary should name the winner specifically');
    assert(
      singleWinnerSummary.detail.startsWith('Played: ') &&
        singleWinnerSummary.detail.includes(ownerPlayer.name) &&
        singleWinnerSummary.detail.includes(memberPlayer.name),
      `single_winner detail should list both participants (got ${JSON.stringify(singleWinnerSummary.detail)})`
    );
    console.log('results.ts getSessionPlaySummaries OK (leaderboard both directions, team, cooperative, single_loser, single_winner)');

    // ------------------------------------------------------------------
    // 8. results.ts - getPlayForEdit. Reuses club/player fixtures already
    //    in scope; adds one leaderboard play and one team_based play to a
    //    fresh session so this section doesn't disturb section 6/7's own
    //    wins/played counts or summary assertions.
    // ------------------------------------------------------------------
    const [editSession] = await db
      .insert(schema.sessions)
      .values({ clubId: club.id, name: `${MARKER}-Edit Session`, date: new Date(), active: true })
      .returning();
    fixtures.sessionIds.push(editSession.id);

    const [editPlayLeaderboard] = await db
      .insert(schema.plays)
      .values({ sessionId: editSession.id, gameId: gameLeaderboard.id, notes: `${MARKER}-edit notes` })
      .returning();
    fixtures.playIds.push(editPlayLeaderboard.id);
    await db.insert(schema.leaderboardResults).values([
      { playId: editPlayLeaderboard.id, playerId: ownerPlayer.id, score: 15 },
      { playId: editPlayLeaderboard.id, playerId: memberPlayer.id, score: 30 },
    ]);

    const [editPlayTeam] = await db
      .insert(schema.plays)
      .values({ sessionId: editSession.id, gameId: gameTeamBased.id })
      .returning();
    fixtures.playIds.push(editPlayTeam.id);
    await db.insert(schema.teamResults).values([
      { playId: editPlayTeam.id, playerId: ownerPlayer.id, team: 'Red', won: false },
      { playId: editPlayTeam.id, playerId: memberPlayer.id, team: 'Blue', won: true },
    ]);

    const leaderboardEdit = await results.getPlayForEdit(club.id, editPlayLeaderboard.id);
    assert(leaderboardEdit, 'getPlayForEdit should find the leaderboard play');
    assertEqual(leaderboardEdit.gameId, gameLeaderboard.id, 'leaderboard edit data should resolve the right game');
    assertEqual(leaderboardEdit.notes, `${MARKER}-edit notes`, 'leaderboard edit data should carry play notes through');
    assertEqual(leaderboardEdit.winCondition, 'leaderboard', 'leaderboard edit data should resolve effective win condition');
    assertEqual(leaderboardEdit.scoresByPlayerId[ownerPlayer.id], 15, 'leaderboard edit data should carry owner score');
    assertEqual(leaderboardEdit.scoresByPlayerId[memberPlayer.id], 30, 'leaderboard edit data should carry member score');
    assertSameSet(
      leaderboardEdit.participantIds,
      [ownerPlayer.id, memberPlayer.id],
      'leaderboard edit data should list both participants'
    );

    const teamEdit = await results.getPlayForEdit(club.id, editPlayTeam.id);
    assert(teamEdit, 'getPlayForEdit should find the team play');
    assertEqual(teamEdit.winCondition, 'team_based', 'team edit data should resolve effective win condition');
    assertEqual(teamEdit.teamByPlayerId[ownerPlayer.id], 'Red', 'team edit data should carry owner team assignment');
    assertEqual(teamEdit.teamByPlayerId[memberPlayer.id], 'Blue', 'team edit data should carry member team assignment');
    assertEqual(teamEdit.winningTeam, 'Blue', 'team edit data should identify the winning team from the won:true row');

    const missingEdit = await results.getPlayForEdit(club.id, '00000000-0000-0000-0000-000000000000');
    assertEqual(missingEdit, null, 'getPlayForEdit should return null for a play id that does not exist');
    console.log('results.ts getPlayForEdit OK (leaderboard rehydration, team rehydration, missing play)');
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
