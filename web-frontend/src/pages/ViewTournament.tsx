import { Button, Card, Container, Form, Table } from 'react-bootstrap';
import DashboardLayout from '../components/DashboardLayout';
import { Loader, WidgetWrapper, Link } from '@innexgo/common-react-components';
import ManageSubmission from '../components/ManageSubmission';
import ManageTournamentSubmissions from '../components/ManageTournamentSubmissions';
import ErrorMessage from '../components/ErrorMessage';

import update from 'immutability-helper';

import { unwrap, getFirstOr } from '@innexgo/frontend-common';

import format from "date-fns/format";

import { Async, AsyncProps } from 'react-async';
import { Submission, submissionView, TournamentData, tournamentDataView, TournamentSubmission, tournamentSubmissionView } from '../utils/api';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { AuthenticatedComponentProps } from '@innexgo/auth-react-components';

type ManageSubmissionPageData = {
  submission: Submission,
  tournamentData: TournamentData[],
  tournamentSubmissions: TournamentSubmission[],
}

const loadManageSubmissionPage = async (props: AsyncProps<ManageSubmissionPageData>): Promise<ManageSubmissionPageData> => {
  const submission = await submissionView({
    submissionId: [props.submissionId],
    apiKey: props.apiKey.key,
  })
    .then(unwrap)
    .then(x => getFirstOr(x, "NOT_FOUND"))
    .then(unwrap);

  const tournamentSubmissions = await tournamentSubmissionView({
    submissionId: [props.submissionId],
    onlyRecent: true,
    apiKey: props.apiKey.key
  })
    .then(unwrap);

  const tournamentData = await tournamentDataView({
    onlyRecent: true,
    apiKey: props.apiKey.key
  })
    .then(unwrap);

  return {
    tournamentData,
    submission,
    tournamentSubmissions,
  };
}

function ManageSubmissionPage(props: AuthenticatedComponentProps) {
  const submissionId = parseInt(new URLSearchParams(window.location.search).get("tournamentId") ?? "");

  return (
    <DashboardLayout {...props}>
      <Container fluid className="py-4 px-4">
        <Async promiseFn={loadManageSubmissionPage} submissionId={submissionId} apiKey={props.apiKey}>{
          ({ setData }) => <>
            <Async.Pending><Loader /></Async.Pending>
            <Async.Rejected>{e => <ErrorMessage error={e} />}</Async.Rejected>
            <Async.Fulfilled<ManageSubmissionPageData>>{data => <>
              <div className="mx-3 my-3">
                <WidgetWrapper title="Submission Data">
                  <span>Shows basic information about this submission.</span>
                  <ManageSubmission
                    submission={data.submission}
                    apiKey={props.apiKey}
                  />
                </WidgetWrapper>
              </div>

              <div className="mx-3 my-3">
                <WidgetWrapper title="Courses">
                  <span>Shows the tournaments this submission is in.</span>
                  <ManageTournamentSubmissions
                    tournamentData={data.tournamentData}
                    tournamentSubmissions={data.tournamentSubmissions}
                    setTournamentSubmissions={tournamentSubmissions => setData(update(data, { tournamentSubmissions: { $set: tournamentSubmissions } }))}
                    apiKey={props.apiKey}
                  />
                </WidgetWrapper>
              </div>
            </>}
            </Async.Fulfilled>
          </>}
        </Async>
      </Container>
    </DashboardLayout>
  )
}


export default ManageSubmissionPage;
