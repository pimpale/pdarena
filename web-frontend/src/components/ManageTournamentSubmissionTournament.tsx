import React from 'react';
import { Table } from 'react-bootstrap';
import update from 'immutability-helper';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { Link, AddButton, DisplayModal } from '@innexgo/common-react-components';
import { TournamentSubmission } from '../utils/api';
import { ViewUser } from './ViewData';

import { Eye as ViewIcon } from 'react-bootstrap-icons';

type ManageTournamentSubmissionRowProps = {
  tournamentSubmission: TournamentSubmission,
  setTournamentSubmission: (t: TournamentSubmission) => void,
  mutable: boolean
  apiKey: ApiKey
}

function ManageTournamentSubmissionRow(props: ManageTournamentSubmissionRowProps) {
  return <tr>
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
  showInactive: boolean,
  mutable: boolean,
  apiKey: ApiKey,
}

function ManageTournamentSubmissionsTournament(props: ManageTournamentSubmissionsTournamentProps) {
  // this list has an object consisting of both the index in the real array and the object constructs a new objec
  const activeTemplates = props.tournamentSubmissions
    // enumerate data + index
    .map((t, i) => ({ t, i }))
    // filter inactive
    .filter(({ t }) => props.showInactive || t.kind !== "CANCEL");


  const [showCreateTemplate, setShowCreateTemplate] = React.useState(false);

  return <Table hover bordered>
    <thead>
      <tr>
        <th>Name</th>
        <th>Creator</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {activeTemplates.length === 0
        ? <tr><td className="text-center" colSpan={4}>No Submissions or Testcases</td></tr>
        : <> </>
      }
      {activeTemplates
        // reverse in order to see newest first
        .reverse()
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

export default ManageTournamentSubmissionsTournament;
