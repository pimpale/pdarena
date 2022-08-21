import React from 'react';
import { Table } from 'react-bootstrap';
import { Link } from '@innexgo/common-react-components';
import { Eye as ViewIcon } from 'react-bootstrap-icons';
import { MatchResolution, TournamentData, TournamentSubmission } from '../utils/api';
import format from 'date-fns/format';

const ManageMatchResolution = (props: {
  matchResolution: MatchResolution,
  tournamentData: TournamentData,
  tournamentSubmission: TournamentSubmission,
  opponentTournamentSubmission: TournamentSubmission,
}) => {
  return <Table hover bordered>
    <tbody>
      <tr>
        <th>Matchup</th>
        <td>{props.matchResolution.matchup}</td>
      </tr>
      <tr>
        <th>Round</th>
        <td>{props.matchResolution.round}</td>
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
      <tr>
        <th>Submission</th>
        <td>
          <Link
            title={props.tournamentSubmission.name}
            icon={ViewIcon}
            href={`/tournament_submission?tournamentId=${props.tournamentSubmission.tournament.tournamentId}&submissionId=${props.tournamentSubmission.submissionId}`}
          />
        </td>
      </tr>
      <tr>
        <th>Opponent Submission</th>
        <td>
          <Link
            title={props.opponentTournamentSubmission.name}
            icon={ViewIcon}
            href={`/tournament_submission?tournamentId=${props.opponentTournamentSubmission.tournament.tournamentId}&submissionId=${props.opponentTournamentSubmission.submissionId}`}
          />
        </td>
      </tr>
      <tr>
        <th>Response</th>
        <td>{
          props.matchResolution.defected === null
            ? "No Response"
            : props.matchResolution.defected
              ? "Defected"
              : "Cooperated"
        }</td>
      </tr>
    </tbody>
  </Table>
}

export default ManageMatchResolution;
