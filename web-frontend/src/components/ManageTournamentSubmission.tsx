import React from 'react';
import { Table } from 'react-bootstrap';
import { Action, DisplayModal, Link } from '@innexgo/common-react-components';
import { Eye as ViewIcon, Pencil as EditIcon, X as DeleteIcon, } from 'react-bootstrap-icons';
import { TournamentData, TournamentSubmission, TournamentSubmissionKind } from '../utils/api';
import format from 'date-fns/format';


import ArchiveTournamentSubmission from '../components/ArchiveTournamentSubmission';
import EditTournamentSubmission from '../components/EditTournamentSubmission';
import { ApiKey } from '@innexgo/frontend-auth-api';


const key = new Map<TournamentSubmissionKind, string>([
  ["VALIDATE", "text-success"],
  ["COMPETE", "text-primary"],
  ["CANCEL", "text-secondary"],
  ["TESTCASE", "text-success"],
]);


const ManageTournamentSubmission = (props: {
  tournamentSubmission: TournamentSubmission,
  tournamentData: TournamentData,
  setTournamentSubmission: (ts: TournamentSubmission) => void,
  mutable: boolean,
  apiKey: ApiKey,
}) => {

  const [showEditTournamentSubmissionModal, setShowEditTournamentSubmissionModal] = React.useState(false);
  const [showCancelTournamentSubmissionModal, setShowCancelTournamentSubmissionModal] = React.useState(false);

  return <>
    <Table hover bordered>
      <tbody>
        <tr>
          <th>Name</th>
          <td>
            <h5 children={props.tournamentSubmission.name} />
          </td>
        </tr>
        <tr>
          <th>Status</th>
          <td>
            <h5
              className={key.get(props.tournamentSubmission.kind)}
              children={props.tournamentSubmission.kind}
            />
          </td>
        </tr>
        <tr>
          <th>Creation Time</th>
          <td>{format(props.tournamentData.tournament.creationTime, "MMM do, hh:mm")} </td>
        </tr>
        <tr>
          <th>Tournament</th>
          <td>
            <Link
              title={props.tournamentData.title}
              icon={ViewIcon}
              href={`/tournament?tournamentId=${props.tournamentData.tournament.tournamentId}`}
            />
          </td>
        </tr>
      </tbody>
    </Table>
    <div hidden={!props.mutable}>
      <Action
        title="Edit"
        icon={EditIcon}
        onClick={() => setShowEditTournamentSubmissionModal(true)}
      />
      {props.tournamentSubmission.kind === "CANCEL" ? null :
        <Action
          title="Delete"
          icon={DeleteIcon}
          variant="danger"
          onClick={() => setShowCancelTournamentSubmissionModal(true)}
        />
      }
    </div>
    <DisplayModal
      title="Edit Tournament Submission"
      show={showEditTournamentSubmissionModal}
      onClose={() => setShowEditTournamentSubmissionModal(false)}
    >
      <EditTournamentSubmission
        tournamentSubmission={props.tournamentSubmission}
        setTournamentSubmission={ts => {
          props.setTournamentSubmission(ts);
          setShowEditTournamentSubmissionModal(false);
        }}
        apiKey={props.apiKey}
      />
    </DisplayModal>
    <DisplayModal
      title="Cancel Tournament Submission"
      show={showCancelTournamentSubmissionModal}
      onClose={() => setShowCancelTournamentSubmissionModal(false)}
    >
      <ArchiveTournamentSubmission
        tournamentSubmission={props.tournamentSubmission}
        setTournamentSubmission={ts => {
          props.setTournamentSubmission(ts);
          setShowCancelTournamentSubmissionModal(false);
        }}
        apiKey={props.apiKey}
      />
    </DisplayModal>

  </>
}

export default ManageTournamentSubmission;
