import React from 'react';
import { Table } from 'react-bootstrap';
import update from 'immutability-helper';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { Link, AddButton, DisplayModal } from '@innexgo/common-react-components';
import { MatchResolution, TournamentSubmission } from '../utils/api';
import { ViewUser } from './ViewData';

import { Eye as ViewIcon } from 'react-bootstrap-icons';
import { ROUNDS, score } from '../utils/scoring';

type ManageTournamentSubmissionRowProps = {
  rankingData?: { rank: number, score: number },
  tournamentSubmission: TournamentSubmission,
  setTournamentSubmission: (t: TournamentSubmission) => void,
  mutable: boolean
  apiKey: ApiKey
}

function ManageTournamentSubmissionRow(props: ManageTournamentSubmissionRowProps) {
  return <tr>
    <td>{props.rankingData?.rank
      ? <b>{props.rankingData.rank}</b>
      : "N/A"
    }</td>
    <td>{props.rankingData?.score
      ? <b>{props.rankingData.score.toFixed(3)}</b>
      : "N/A"
    }</td>
    <td>{props.tournamentSubmission.name}</td>
    <td><ViewUser userId={props.tournamentSubmission.creatorUserId} apiKey={props.apiKey} expanded={false} /></td>
    <td>{props.tournamentSubmission.kind}</td>
    <td>
      <Link
        title="View"
        icon={ViewIcon}
        href={`/tournament_submission?tournamentId=${props.tournamentSubmission.tournament.tournamentId}&submissionId=${props.tournamentSubmission.submissionId}`}
      />
    </td>
  </tr>
}


type ManageTournamentSubmissionsTournamentProps = {
  tournamentSubmissions: TournamentSubmission[],
  setTournamentSubmissions: (tournamentSubmissions: TournamentSubmission[]) => void,
  matches: MatchResolution[]
  showInactive: boolean,
  mutable: boolean,
  apiKey: ApiKey,
}

function ManageTournamentSubmissionsTournament(props: ManageTournamentSubmissionsTournamentProps) {
  // this list has an object consisting of both the index in the real array and the object constructs a new objec

  type TableRowData = {
    t: TournamentSubmission,
    i: number,
  }

  const nonCompetingSubmission: TableRowData[] = [];
  const competingSubmission: TableRowData[] = [];
  for (let i = 0; i < props.tournamentSubmissions.length; i++) {
    const t = props.tournamentSubmissions[i];
    switch (t.kind) {
      case "COMPETE": {
        competingSubmission.push({ t, i });
        break;
      }
      case "VALIDATE": {
        nonCompetingSubmission.push({ t, i });
        break;
      }
      case "TESTCASE": {
        nonCompetingSubmission.push({ t, i });
        break;
      }
      case "CANCEL": {
        if (props.showInactive) {
          nonCompetingSubmission.push({ t, i });
        }
      }
    }
  }

  type EnhancedTableRowData = {
    t: TournamentSubmission,
    i: number,
    s: number
  }

  const scoreMap = scoreEntries(competingSubmission.map(x => x.t), props.matches);

  // score
  const scoredCompetingSubmissions: EnhancedTableRowData[] = competingSubmission
    .map(({ t, i }) => ({ t, i, s: scoreMap.get(t.tournamentSubmissionId)! }));

  // sort
  scoredCompetingSubmissions.sort((a, b) => b.s - a.s)



  const [showCreateTemplate, setShowCreateTemplate] = React.useState(false);

  return <Table hover bordered>
    <thead>
      <tr>
        <th>Rank</th>
        <th>Score</th>
        <th>Name</th>
        <th>Creator</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {nonCompetingSubmission.length + scoredCompetingSubmissions.length === 0
        ? <tr><td className="text-center" colSpan={4}>No Submissions or Testcases</td></tr>
        : <> </>
      }
      {scoredCompetingSubmissions
        .map(({ t, i, s }, j) =>
          <ManageTournamentSubmissionRow
            key={i}
            rankingData={{ rank: j + 1, score: s }}
            mutable={props.mutable}
            tournamentSubmission={t}
            setTournamentSubmission={(t) => props.setTournamentSubmissions(update(props.tournamentSubmissions, { [i]: { $set: t } }))}
            apiKey={props.apiKey}
          />
        )}
      {nonCompetingSubmission
        .map(({ t, i }) =>
          <ManageTournamentSubmissionRow
            key={i}
            mutable={props.mutable}
            tournamentSubmission={t}
            setTournamentSubmission={(t) => props.setTournamentSubmissions(update(props.tournamentSubmissions, { [i]: { $set: t } }))}
            apiKey={props.apiKey}
          />
        )}
    </tbody>
  </Table>
}

function scoreEntries(tournamentSubmissions: TournamentSubmission[], matches: MatchResolution[]) {
  // construct indexes to avoid paying linear cost
  const matchesById = new Map<string, Map<number, MatchResolution>>();

  for (const match of matches) {
    const id = JSON.stringify([match.submissionId, match.opponentSubmissionId]);
    const matchesByIdResult = matchesById.get(id);
    if (matchesByIdResult === undefined) {
      matchesById.set(id, new Map([[match.round, match]]));
    } else {
      matchesByIdResult.set(match.round, match);
    }
  }

  const retValue = new Map<number, number>();

  for (const submission of tournamentSubmissions) {
    const row: { avgScore: number, disqualified: boolean }[] = []
    for (const opponentSubmission of tournamentSubmissions) {
      const reg = matchesById.get(JSON.stringify([submission.submissionId, opponentSubmission.submissionId]));
      const rev = matchesById.get(JSON.stringify([opponentSubmission.submissionId, submission.submissionId]));

      type Entry = {
        m1: MatchResolution,
        m2: MatchResolution,
        m_score?: number
      }

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
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const disqualified = isNaN(avgScore) || entries.some(({ m_score }) => m_score === undefined);

      row.push({ avgScore, disqualified });
    }

    // take average of the non-disqualified rounds
    const validScores = row.filter(x => !x.disqualified).map(x => x.avgScore);

    // add to map of tournamentSubmissionId  to score
    const avgAvgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    retValue.set(submission.tournamentSubmissionId, avgAvgScore);
  }

  return retValue;
}

export default ManageTournamentSubmissionsTournament;
