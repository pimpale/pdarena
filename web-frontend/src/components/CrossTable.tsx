import { MatchResolution, MatchResolutionLite, Tournament, TournamentData, TournamentSubmission } from "../utils/api"
import { scorePrisonersDilemma } from "../utils/scoring";

import update from 'immutability-helper';


// ba = update(ba, {
//   [mrl.submissionId]: x => update(x ?? new Map(), {
//     [mrl.opponentSubmissionId]: y => update(y ?? new Map(), {
//       [mrl.matchup]: z => update(z ?? new Map(), {
//         [mrl.round]: { $set: mrl }
//       })
//     })
//   })
// });


export function lookupTableWebsocketGenerator(setLookupTable: (f: ((l: LookupTable) => LookupTable)) => void) {
  return function(msg: MessageEvent<string>) {
    // get match resolution lite
    const mrl: MatchResolutionLite = JSON.parse(msg.data);
    // set lookup table with data given
    setLookupTable(state =>
      update(state, {
        [mrl.submissionId]: x => update(x ?? [], {
          [mrl.opponentSubmissionId]: y => update(y ?? [], {
            [mrl.matchup]: z => update(z ?? [], {
              [mrl.round]: { $set: mrl }
            })
          })
        })
      })
    );
  }
}


export type LookupTable =
  // Submission Id
  Array<
    // Opponent Submission Id
    Array<
      // by matchup id
      Array<
        // by round id
        Array<
          MatchResolutionLite
        >
      >
    >
  >;


export type Entry = {
  score?: number,
  submission?: MatchResolutionLite,
  opponent?: MatchResolutionLite,
}

export type MatchupResult = {
  entries: Array<Array<Entry>>,
  avgScore: number,
  disqualified: boolean,
  nEntries: number,
}

export function scoreMatchups(
  tournamentData: TournamentData,
  matches: LookupTable,
  submission: TournamentSubmission,
  opponentSubmission: TournamentSubmission,
): MatchupResult {
  const reg = matches[submission.submissionId]?.[opponentSubmission.submissionId];
  const rev = matches[opponentSubmission.submissionId]?.[submission.submissionId];


  const entries: Array<Array<Entry>> = [];
  for (let matchup = 0; matchup < tournamentData.nMatchups; matchup++) {
    const reg_matchup = reg?.[matchup];
    const rev_matchup = rev?.[matchup];
    const entry_row: Array<Entry> = [];
    for (let round = 0; round < tournamentData.nRounds; round++) {
      const submission = reg_matchup?.[round];
      const opponent = rev_matchup?.[round];
      const submission_defected = submission?.defected;
      const opponent_defected = opponent?.defected;
      const score = typeof submission_defected === 'boolean' && typeof opponent_defected === 'boolean'
        ? scorePrisonersDilemma(submission_defected, opponent_defected)
        : undefined;
      entry_row.push({
        score,
        submission,
        opponent,
      })
    }
    entries.push(entry_row);
  }

  // disqualified if we have missing entries
  const disqualified = entries.some(row => row.some(e => e.score === undefined));

  const scores = entries.flat().filter(e => e.score !== undefined).map(e => e.score || 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  return { entries, avgScore, disqualified, nEntries: scores.length }
}

export function scoreEntries(
  tournamentData: TournamentData,
  tournamentSubmissions: TournamentSubmission[],
  matches: LookupTable
) {
  const table: { rowSubmission: TournamentSubmission, row: MatchupResult[] }[] = [];
  for (const rowSubmission of tournamentSubmissions) {
    const row: MatchupResult[] = []
    for (const colSubmission of tournamentSubmissions) {
      row.push(scoreMatchups(
        tournamentData,
        matches,
        rowSubmission,
        colSubmission
      ));
    }
    table.push({ rowSubmission, row });
  }
  return table;
}

type CrossTableProps = {
  tournamentData: TournamentData
  tournamentSubmissions: TournamentSubmission[]
  matches: LookupTable
}

function CrossTable(props: CrossTableProps) {
  // only show competing ones
  const tournamentSubmissions = props.tournamentSubmissions.filter(x => x.kind === "COMPETE");

  // early exit if no submissions
  if (tournamentSubmissions.length === 0) {
    return <h5 className="m-5">No Competing Submissions!</h5>
  }

  const table = scoreEntries(props.tournamentData, props.tournamentSubmissions, props.matches);

  return <table className="mt-5" style={{ display: "inline-table" }}>
    <thead>
      <tr>
        <th></th>
        {tournamentSubmissions.map(x =>
          <th
            key={x.tournamentSubmissionId}
            style={{
              position: 'relative',
              width: 50,
              height: 30,
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: "100%",
                textAlign: "start",
                transformOrigin: "top left",
                transform: "rotate(-45deg)",
                whiteSpace: "nowrap",
              }}
            >
              <a href={`/tournament_submission?tournamentId=${x.tournament.tournamentId}&submissionId=${x.submissionId}`}>{x.name}</a>
            </div>
          </th>
        )}
      </tr>
    </thead>
    <tbody>{table.map(({ rowSubmission, row }) =>
      <tr key={rowSubmission.tournamentSubmissionId}>
        <th style={{ whiteSpace: "nowrap", textAlign: "end" }}>
          <a href={`/tournament_submission?tournamentId=${rowSubmission.tournament.tournamentId}&submissionId=${rowSubmission.submissionId}`}>{
            rowSubmission.name
          }</a>
        </th>
        {row.map((x, i) =>
          <td
            key={i}
            style={{ backgroundColor: x.disqualified ? undefined : getBackgroundColor(x.avgScore) }}
          >
            {x.avgScore.toFixed(3)}
          </td>
        )}
      </tr>
    )}</tbody>
  </table>
}

export function getBackgroundColor(score: number) {
  const greenContent = 255 * (score / 10);
  const redContent = 255 * (1 - score / 10);
  return `rgba(${redContent}, ${greenContent}, 0, 1)`;
}

export default CrossTable;
