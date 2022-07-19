import { Card, Container, Form, Table } from 'react-bootstrap';
import DashboardLayout from '../components/DashboardLayout';
import { Loader, WidgetWrapper, Link, Section } from '@innexgo/common-react-components';
import ManageTournamentData from '../components/ManageTournamentData';
import ErrorMessage from '../components/ErrorMessage';

import update from 'immutability-helper';

import { unwrap, getFirstOr } from '@innexgo/frontend-common';

import format from "date-fns/format";

import { Async, AsyncProps } from 'react-async';
import { MatchResolution, matchResolutionView, Submission, submissionView, TournamentData, tournamentDataView, TournamentSubmission, tournamentSubmissionView } from '../utils/api';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { AuthenticatedComponentProps } from '@innexgo/auth-react-components';
import ManageTournamentSubmissionsTournament from '../components/ManageTournamentSubmissionTournament';
import CrossTable from '../components/CrossTable';

type ManageTournamentPageData = {
  tournamentData: TournamentData,
  tournamentSubmissions: TournamentSubmission[],
  matches: MatchResolution[],
}

const loadManageTournamentPage = async (props: AsyncProps<ManageTournamentPageData>): Promise<ManageTournamentPageData> => {
  const tournamentData = await tournamentDataView({
    tournamentId: [props.tournamentId],
    onlyRecent: true,
    apiKey: props.apiKey.key
  })
    .then(unwrap)
    .then(x => getFirstOr(x, "NOT_FOUND"))
    .then(unwrap);

  const tournamentSubmissions = await tournamentSubmissionView({
    tournamentId: [props.tournamentId],
    onlyRecent: true,
    apiKey: props.apiKey.key
  })
    .then(unwrap);


  const submissionIds = tournamentSubmissions.map(x => x.submissionId);

  const matchesAsSubmission = await matchResolutionView({
    submissionId: submissionIds,
    apiKey: props.apiKey.key
  })
    .then(unwrap);

  const matchesAsOpponent = await matchResolutionView({
    opponentSubmissionId: submissionIds,
    apiKey: props.apiKey.key
  })
    .then(unwrap);


  return {
    tournamentData,
    tournamentSubmissions,
    matches: [...matchesAsSubmission, ...matchesAsOpponent]
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
              <Section name="Table" id="table">
                <b>Note:</b> submissions are on the columns, opponents are on the rows.
                <div className="text-center p-3" style={{ overflow: "scroll" }}>
                  <CrossTable
                    tournamentSubmissions={data.tournamentSubmissions}
                    matches={data.matches}
                  />
                </div>
              </Section>
              <Section name="Leaderboard" id="leaderboard">
                <ManageTournamentSubmissionsTournament
                  tournamentSubmissions={data.tournamentSubmissions}
                  setTournamentSubmissions={tournamentSubmissions => setData(update(data, { tournamentSubmissions: { $set: tournamentSubmissions } }))}
                  apiKey={props.apiKey}
                  matches={data.matches}
                  showInactive={false}
                  mutable={true}
                />
              </Section>
              <div className="text-center">
                <a className="btn btn-primary mx-3" href={`/compete?tournamentId=${tournamentId}&kind=VALIDATE`}>
                  Compete!
                </a>
                <a className="btn btn-primary mx-3" href={`/compete?tournamentId=${tournamentId}&kind=TESTCASE`} hidden={props.apiKey.creatorUserId !== data.tournamentData.tournament.creatorUserId}>
                  Write a Testcase!
                </a>
              </div>
            </>}
            </Async.Fulfilled>
          </>}
        </Async>
      </Container>
    </DashboardLayout>
  )
}


export default ManageTournamentPage;
