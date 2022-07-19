import { MatchResolution, TournamentSubmission } from "../utils/api"
import { ROUNDS, score } from "../utils/scoring";

type CrossTableProps = {
  tournamentSubmissions: TournamentSubmission[]
  matches: MatchResolution[]
}

function CrossTable(props: CrossTableProps) {
  // only show competing ones
  const tournamentSubmissions = props.tournamentSubmissions.filter(x => x.kind === "COMPETE");

  // early exit if no submissions
  if (tournamentSubmissions.length === 0) {
    return <h5 className="m-5">No Competing Submissions!</h5>
  }

  type Entry = {
    m1: MatchResolution,
    m2: MatchResolution,
    m_score?: number
  }

  type MatchupResult = {
    entries: Entry[],
    avgScore: number,
    disqualified: boolean,
  }

  // construct indexes to avoid paying linear cost
  const matchesById = new Map<string, Map<number, MatchResolution>>();

  for (const match of props.matches) {
    const id = JSON.stringify([match.submissionId, match.opponentSubmissionId]);
    const matchesByIdResult = matchesById.get(id);
    if (matchesByIdResult === undefined) {
      matchesById.set(id, new Map([[match.round, match]]));
    } else {
      matchesByIdResult.set(match.round, match);
    }
  }

  const table: { rowSubmission: TournamentSubmission, row: MatchupResult[] }[] = [];

  for (const rowSubmission of tournamentSubmissions) {
    const row: MatchupResult[] = []
    for (const colSubmission of tournamentSubmissions) {
      const reg = matchesById.get(JSON.stringify([colSubmission.submissionId, rowSubmission.submissionId]));
      const rev = matchesById.get(JSON.stringify([rowSubmission.submissionId, colSubmission.submissionId]));

      const entries: Entry[] = []
      for (let round = 0; round < ROUNDS; round++) {
        const m1 = reg?.get(round);
        const m2 = rev?.get(round);
        if (m1 && m2) {
          const m_score = m1.defected !== null && m2.defected !== null
            ? score(m1.defected, m2.defected)
            : undefined
          entries.push({ m1, m2, m_score })
        }
      }

      const scores = entries.filter(({ m_score }) => m_score !== undefined).map(({ m_score }) => m_score || 0);
      const disqualified = entries.some(({ m_score }) => m_score === undefined);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      row.push({ entries, avgScore, disqualified });
    }
    table.push({ rowSubmission, row });
  }



  return <table className="mt-5" style={{ display: "inline-table" }}>
    <thead>
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
    </thead>
    <tbody>{table.map(({ rowSubmission, row }) =>
      <tr key={rowSubmission.tournamentSubmissionId}>
        <th style={{ whiteSpace: "nowrap", textAlign: "end" }}>
          <a href={`/tournament_submission?tournamentId=${rowSubmission.tournament.tournamentId}&submissionId=${rowSubmission.submissionId}`}>{
            rowSubmission.name
          }</a>
        </th>
        {row.map(x =>
          <td style={{ backgroundColor: x.disqualified ? undefined : getBackgroundColor(x.avgScore) }}>
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
  return `rgb(${redContent}, ${greenContent}, 0)`;
}

export default CrossTable;
