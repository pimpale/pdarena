import React from 'react';
import { Table } from 'react-bootstrap';
import update from 'immutability-helper';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { Link, AddButton, DisplayModal } from '@innexgo/common-react-components';
import { MatchResolution, TournamentData, TournamentSubmission } from '../utils/api';
import { ViewUser } from './ViewData';

import { Eye as ViewIcon } from 'react-bootstrap-icons';
import { scorePrisonersDilemma } from '../utils/scoring';
import { LookupTable, scoreEntries, tournamentSubmissionColors } from './CrossTable';

type ManageTournamentSubmissionRowProps = {
  rankingData?: { rank: number, score: number },
  tournamentSubmission: TournamentSubmission,
  setTournamentSubmission: (t: TournamentSubmission) => void,
  mutable: boolean
  apiKey: ApiKey
}

function ManageTournamentSubmissionRow(props: ManageTournamentSubmissionRowProps) {
  return <tr>
    <td>{props.rankingData?.rank !== undefined
      ? <b>{props.rankingData.rank + 1}</b>
      : "N/A"
    }</td>
    <td>{props.rankingData?.score !== undefined
      ? <b>{props.rankingData.score.toFixed(3)}</b>
      : "N/A"
    }</td>
    <td>{props.tournamentSubmission.name}</td>
    <td><ViewUser userId={props.tournamentSubmission.creatorUserId} apiKey={props.apiKey} expanded={false} /></td>
    <td>
      <h5
        className={tournamentSubmissionColors.get(props.tournamentSubmission.kind)}
        children={props.tournamentSubmission.kind}
      />
    </td>
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
  tournamentData: TournamentData,
  tournamentSubmissions: TournamentSubmission[],
  setTournamentSubmissions: (tournamentSubmissions: TournamentSubmission[]) => void,
  matches: LookupTable
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

  const scoreTable = scoreEntries(props.tournamentData, competingSubmission.map(x => x.t), props.matches);
  const scoreMap = new Map(scoreTable.map(x => {
    // all non NaN scores in row
    const validScores = x.row.map(x => x.avgScore).filter(x => !isNaN(x));
    return [
      // id
      x.rowSubmission.tournamentSubmissionId,
      // average score
      validScores.reduce((acc, o) => acc + o, 0) / validScores.length,
    ]
  }));

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
    <tbody>{
      nonCompetingSubmission.length + scoredCompetingSubmissions.length === 0
        ? <tr><td className="text-center" colSpan={6}>No Submissions or Testcases</td></tr>
        : null
    }{
        scoredCompetingSubmissions
          .map(({ t, i, s }, j) =>
            <ManageTournamentSubmissionRow
              key={i}
              rankingData={{ rank: j, score: s }}
              mutable={props.mutable}
              tournamentSubmission={t}
              setTournamentSubmission={(t) => props.setTournamentSubmissions(update(props.tournamentSubmissions, { [i]: { $set: t } }))}
              apiKey={props.apiKey}
            />
          )
      }{
        nonCompetingSubmission
          .map(({ t, i }) =>
            <ManageTournamentSubmissionRow
              key={i}
              mutable={props.mutable}
              tournamentSubmission={t}
              setTournamentSubmission={(t) => props.setTournamentSubmissions(update(props.tournamentSubmissions, { [i]: { $set: t } }))}
              apiKey={props.apiKey}
            />
          )
      }</tbody>
  </Table>
}



export default ManageTournamentSubmissionsTournament;
