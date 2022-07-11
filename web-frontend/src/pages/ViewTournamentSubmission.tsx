import React from 'react';

import { Card, Container, Form, Table } from 'react-bootstrap';
import DashboardLayout from '../components/DashboardLayout';
import { Loader, WidgetWrapper, Link, Section, DisplayModal, Action } from '@innexgo/common-react-components';
import ErrorMessage from '../components/ErrorMessage';

import update from 'immutability-helper';

import { unwrap, getFirstOr } from '@innexgo/frontend-common';

import format from "date-fns/format";

import { Async, AsyncProps } from 'react-async';
import { Submission, submissionView, TournamentData, tournamentDataView, TournamentSubmission, tournamentSubmissionView } from '../utils/api';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { AuthenticatedComponentProps } from '@innexgo/auth-react-components';


import { Prism as SyntaxHighligher } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import ArchiveTournamentSubmission from '../components/ArchiveTournamentSubmission';
import EditTournamentSubmission from '../components/EditTournamentSubmission';

import { Pencil as EditIcon, X as DeleteIcon, } from 'react-bootstrap-icons';

type ManageTournamentSubmissionPageData = {
  tournamentData: TournamentData,
  tournamentSubmission: TournamentSubmission,
  submission?: Submission,
}

const loadManageTournamentSubmissionPage = async (props: AsyncProps<ManageTournamentSubmissionPageData>): Promise<ManageTournamentSubmissionPageData> => {
  const tournamentSubmission = await tournamentSubmissionView({
    tournamentId: [props.tournamentId],
    submissionId: [props.submissionId],
    onlyRecent: true,
    apiKey: props.apiKey.key
  })
    .then(unwrap)
    .then(x => getFirstOr(x, "NOT_FOUND"))
    .then(unwrap);

  const tournamentData = await tournamentDataView({
    tournamentId: [props.tournamentId],
    onlyRecent: true,
    apiKey: props.apiKey.key
  })
    .then(unwrap)
    .then(x => getFirstOr(x, "NOT_FOUND"))
    .then(unwrap);

  const submission = await submissionView({
    submissionId: [props.submissionId],
    apiKey: props.apiKey.key
  })
    .then(unwrap)
    .then(x => x[0])


  return {
    tournamentData,
    tournamentSubmission,
    submission
  };
}

type HiddenCodeCardProps = {
  className: string
};


const HiddenCodeCard = (props: HiddenCodeCardProps) =>
  <div
    className={props.className}
    style={{ borderStyle: 'dashed', borderWidth: "medium", height: "20rem" }}
  >
    <h5 className='mx-auto my-auto text-muted'>Hidden</h5>
  </div>


function ManageTournamentSubmissionPage(props: AuthenticatedComponentProps) {
  const tournamentId = parseInt(new URLSearchParams(window.location.search).get("tournamentId") ?? "");
  const submissionId = parseInt(new URLSearchParams(window.location.search).get("submissionId") ?? "");

  const [showEditTournamentSubmissionModal, setShowEditTournamentSubmissionModal] = React.useState(false);
  const [showCancelTournamentSubmissionModal, setShowCancelTournamentSubmissionModal] = React.useState(false);

  return (
    <DashboardLayout {...props}>
      <Container fluid className="py-4 px-4">
        <Async promiseFn={loadManageTournamentSubmissionPage} tournamentId={tournamentId} submissionId={submissionId} apiKey={props.apiKey}>{
          ({ setData }) => <>
            <Async.Pending><Loader /></Async.Pending>
            <Async.Rejected>{e => <ErrorMessage error={e} />}</Async.Rejected>
            <Async.Fulfilled<ManageTournamentSubmissionPageData>>{data => <>
              <Section name={data.tournamentSubmission.name} id="intro">
                {data.submission === undefined
                  ? <HiddenCodeCard className='h-100' />
                  : <SyntaxHighligher
                    className="mx-5 mb-5 h-100"
                    showLineNumbers
                    language="python"
                    style={a11yDark}
                    children={data.submission.code} />
                }
                <div className="m-3">
                  <Action
                    title="Edit"
                    icon={EditIcon}
                    onClick={() => setShowEditTournamentSubmissionModal(true)}
                  />
                  {data.tournamentSubmission.kind === "CANCEL" ? null :
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
                    tournamentSubmission={data.tournamentSubmission}
                    setTournamentSubmission={ts => {
                      setData(update(data, { tournamentSubmission: { $set: ts } }));
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
                    tournamentSubmission={data.tournamentSubmission}
                    setTournamentSubmission={ts => {
                      setData(update(data, { tournamentSubmission: { $set: ts } }))
                      setShowCancelTournamentSubmissionModal(false);
                    }}
                    apiKey={props.apiKey}
                  />
                </DisplayModal>
              </Section>
              <Section name="Leaderboard" id="leaderboard">
                <div />
              </Section>
            </>}
            </Async.Fulfilled>
          </>}
        </Async>
      </Container>
    </DashboardLayout>
  )
}


export default ManageTournamentSubmissionPage;
