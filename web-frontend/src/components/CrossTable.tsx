import { MatchResolution, MatchResolutionLite, Tournament, TournamentData, TournamentSubmission } from "../utils/api"
import { score } from "../utils/scoring";

export type LookupTable =
  // Submission Id
  Map<number,
    // Opponent Submission Id
    Map<number,
      // by matchup id
      Map<number,
        // by round id
        Map<number,
          MatchResolutionLite
        >
      >
    >
  >;

export type MatchupResult = {
  entries: Array<Array<number | undefined>>,
  avgScore: number,
  disqualified: boolean,
}

export function scoreMatchups(
  tournamentData: TournamentData,
  matches: LookupTable,
  submission: TournamentSubmission,
  opponentSubmission: TournamentSubmission,
): MatchupResult {
  const reg = matches.get(submission.submissionId)?.get(opponentSubmission.submissionId);
  const rev = matches.get(opponentSubmission.submissionId)?.get(submission.submissionId);

  const entries: Array<Array<number | undefined>> = [];
  for (let matchup = 0; matchup < tournamentData.nMatchups; matchup++) {
    const reg_matchup = reg?.get(matchup);
    const rev_matchup = rev?.get(matchup);
    const entry_row: Array<number | undefined> = [];
    for (let round = 0; round < tournamentData.nRounds; round++) {
      const submission_defected = reg_matchup?.get(round)?.defected;
      const opponent_defected = rev_matchup?.get(round)?.defected;
      const m_score = typeof submission_defected === 'boolean' && typeof opponent_defected === 'boolean'
        ? score(submission_defected, opponent_defected)
        : undefined;
      entry_row.push(m_score)
    }
    entries.push(entry_row);
  }

  // disqualified if we have missing entries
  const disqualified = entries.some(row => row.some(m_score => m_score === undefined));

  const scores = entries.flat().filter(m_score => m_score !== undefined).map(m_score => m_score || 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  return { entries, avgScore, disqualified }
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

function getBackgroundColor(score: number) {
  const greenContent = 255 * (score / 10);
  const redContent = 255 * (1 - score / 10);
  return `rgba(${redContent}, ${greenContent}, 0, 1)`;
}

export default CrossTable;
