import { Button, Card, Container, Form, Table } from 'react-bootstrap';
import DashboardLayout from '../components/DashboardLayout';
import { Loader, WidgetWrapper, Link, Section } from '@innexgo/common-react-components';
import ManageTournamentData from '../components/ManageTournamentData';
import ManageTournamentSubmissions from '../components/ManageTournamentSubmissions';
import ErrorMessage from '../components/ErrorMessage';

import update from 'immutability-helper';

import { unwrap, getFirstOr } from '@innexgo/frontend-common';

import format from "date-fns/format";

import { Async, AsyncProps } from 'react-async';
import { Submission, submissionView, TournamentData, tournamentDataView, TournamentSubmission, tournamentSubmissionView } from '../utils/api';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { AuthenticatedComponentProps } from '@innexgo/auth-react-components';

type ManageTournamentPageData = {
  tournamentData: TournamentData,
  tournamentSubmissions: TournamentSubmission[],
}

const loadManageTournamentPage = async (props: AsyncProps<ManageTournamentPageData>): Promise<ManageTournamentPageData> => {
  const tournamentSubmissions = await tournamentSubmissionView({
    submissionId: [props.tournamentId],
    onlyRecent: true,
    apiKey: props.apiKey.key
  })
    .then(unwrap);

  const tournamentData = await tournamentDataView({
    tournamentId: [props.tournamentId],
    onlyRecent: true,
    apiKey: props.apiKey.key
  })
    .then(unwrap)
    .then(x => getFirstOr(x, "NOT_FOUND"))
    .then(unwrap);

  return {
    tournamentData,
    tournamentSubmissions,
  };
}

function ManageTournamentPage(props: AuthenticatedComponentProps) {
  const tournamentId = parseInt(new URLSearchParams(window.location.search).get("tournamentId") ?? "");

  return (
    <DashboardLayout {...props}>
      <Container fluid className="py-4 px-4">
        <Async promiseFn={loadManageTournamentPage} tournamentId={tournamentId} apiKey={props.apiKey}>{
          ({ setData }) => <>
            <Async.Pending><Loader /></Async.Pending>
            <Async.Rejected>{e => <ErrorMessage error={e} />}</Async.Rejected>
            <Async.Fulfilled<ManageTournamentPageData>>{data => <>
              <Section name="Tournament Data" id="intro">
                <div className="my-3">
                  <ManageTournamentData
                    setTournamentData={td => setData(update(data, { tournamentData: { $set: td } }))}
                    tournamentData={data.tournamentData}
                    apiKey={props.apiKey}
                  />
                </div>
              </Section>
              <Section name="Leaderboard" id="leaderboard">
                <div />
              </Section>
              <Section name="Testcases" id="testcases">
                <ManageTestcases
                  tournamentSubmissions={data.tournamentSubmissions}
                  setTournamentSubmissions={tournamentSubmissions => setData(update(data, { tournamentSubmissions: { $set: tournamentSubmissions } }))}
                  apiKey={props.apiKey}
                />
              </Section>
              <Button variant="primary">Compete!</Button>
            </>}
            </Async.Fulfilled>
          </>}
        </Async>
      </Container>
    </DashboardLayout>
  )
}


export default ManageTournamentPage;
