
import React from 'react';
import { Form, Button, Table } from 'react-bootstrap';
import { Loader, Action, DisplayModal } from '@innexgo/common-react-components';
import { Async, AsyncProps } from 'react-async';
import { Submission, TournamentData, TournamentSubmission, } from '../utils/api';
import { ViewUser } from '../components/ViewData';
import { Pencil as EditIcon, X as DeleteIcon, BoxArrowUp as RestoreIcon } from 'react-bootstrap-icons';
import { Formik, FormikHelpers } from 'formik'
import format from 'date-fns/format';

import { isErr, unwrap } from '@innexgo/frontend-common';
import { User, ApiKey } from '@innexgo/frontend-auth-api';


const ManageTournamentSubmissions = (props: {
  tournamentData: TournamentData[],
  tournamentSubmissions: TournamentSubmission[],
  setTournamentSubmissions: (s: TournamentSubmission[]) => void,
  apiKey: ApiKey,
}) => {
  // group by tournament id
  const groupedTS = new Map<number, TournamentSubmission[]>();
  for (const ts of props.tournamentSubmissions) {
    const id = ts.tournament.tournamentId;
    const tl = groupedTS.get(id);
    if (tl) {
      tl.push(ts);
    } else {
      groupedTS.set(id, [ts]);
    }
  }

  const arr: [TournamentData, TournamentSubmission[]][] =
    Array.from(groupedTS,
      ([tournamentId, tournamentSubmissions]) => [
        props.tournamentData.find(x => x.tournament.tournamentId === tournamentId)!,
        tournamentSubmissions
      ]
    );

  return <>
    <Table hover bordered>
      <thead>
        <tr>
          <th>Tournament</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>{
        arr.map(([tournamentData, submissions]) =>
          <tr>
            <td>{tournamentData.title}</td>
            <td>
              <Table hover bordered>
                <tbody>
                  {submissions.map(x => <tr>
                    <td>x.kind</td>
                    <td>x.kind</td>
                  </tr>)}
                </tbody>
              </Table>
            </td>
            <td></td>
          </tr>
        )}</tbody>
    </Table>
  </>
}

export default ManageTournamentSubmissions;
