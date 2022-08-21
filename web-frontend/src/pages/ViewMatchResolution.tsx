import React from 'react';

import { Card, Container, Form, Table } from 'react-bootstrap';
import DashboardLayout from '../components/DashboardLayout';
import { Loader, WidgetWrapper, Link, Section, DisplayModal, Action } from '@innexgo/common-react-components';
import ErrorMessage from '../components/ErrorMessage';

import update from 'immutability-helper';

import { unwrap, getFirstOr } from '@innexgo/frontend-common';

import format from "date-fns/format";

import { Async, AsyncProps } from 'react-async';
import { MatchResolution, matchResolutionView, Submission, submissionView, TournamentData, tournamentDataView, TournamentSubmission, TournamentSubmissionKind, tournamentSubmissionView } from '../utils/api';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { AuthenticatedComponentProps } from '@innexgo/auth-react-components';

import { Prism as SyntaxHighligher } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { score } from '../utils/scoring';
import ManageMatchResolution from '../components/ManageMatchResolution';

type ManageMatchResolutionPageData = {
  matchResolution: MatchResolution,
  tournamentData: TournamentData,
  tournamentSubmission: TournamentSubmission,
  opponentTournamentSubmission: TournamentSubmission,

}

const loadManageMatchResolutionPage = async (props: AsyncProps<ManageMatchResolutionPageData>): Promise<ManageMatchResolutionPageData> => {
  const matchResolution = await matchResolutionView({
    matchResolutionId: [props.matchResolutionId],
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

  const tournamentSubmission = await tournamentSubmissionView({
    tournamentId: [props.tournamentId],
    onlyRecent: true,
    apiKey: props.apiKey.key
  })
    .then(unwrap)
    .then(x => getFirstOr(x, "NOT_FOUND"))
    .then(unwrap);

  const opponentTournamentSubmission = await tournamentSubmissionView({
    tournamentId: [props.tournamentId],
    onlyRecent: true,
    apiKey: props.apiKey.key
  })
    .then(unwrap)
    .then(x => getFirstOr(x, "NOT_FOUND"))
    .then(unwrap);


  return {
    matchResolution,
    tournamentData,
    tournamentSubmission,
    opponentTournamentSubmission,
  };
}


type HiddenCodeCardProps = {
  className: string
};


const HiddenCodeCard = (props: HiddenCodeCardProps) =>
  <div className={props.className} >
    <div
      className='w-100 d-flex bg-light text-secondary'
      style={{ borderStyle: 'dashed', borderWidth: "medium", height: "20rem" }}
    >
      <h5 className='mx-auto my-auto '>Code Hidden</h5>
    </div>
  </div>


type ShowVerifyProgressProps = {
  tournamentData: TournamentData,
  tournamentSubmission: TournamentSubmission,
  tournamentSubmissions: TournamentSubmission[]
  matchesAsSubmission: MatchResolution[]
  matchesAsOpponent: MatchResolution[]
}

type Entry = {
  m1: MatchResolution,
  m2: MatchResolution,
  m_score?: number
}


type ToggleableElementProps = {
  children: React.ReactNode,
}

const ToggleableElement = (props: ToggleableElementProps) => {
  const [expanded, setExpanded] = React.useState(false);

  const expandedStyle = {
  }

  const opacity = 0.0;

  const compressedStyle = {
    overflow: "hidden" as const,
    maxHeight: "10rem",
    mask: `linear-gradient(180deg, black, rgba(255, 255, 255, ${opacity})) center bottom/100% 5rem no-repeat, linear-gradient(180deg, black, black) center top/100% calc(100% - 5rem) no-repeat`
  }

  return <div className='text-center'>
    <div style={expanded ? expandedStyle : compressedStyle} >
      {props.children}
    </div>
    <button className='btn btn-primary' onClick={() => setExpanded(!expanded)}>{expanded ? "Hide" : "Show"}</button>
  </div>
}

function ManageMatchResolutionPage(props: AuthenticatedComponentProps) {
  const matchResolutionId = parseInt(new URLSearchParams(window.location.search).get("matchResolutionId") ?? "");
  const tournamentId = parseInt(new URLSearchParams(window.location.search).get("tournamentId") ?? "");

  return (
    <DashboardLayout {...props}>
      <Container fluid className="py-4 px-4">
        <Async promiseFn={loadManageMatchResolutionPage} tournamentId={tournamentId} matchResolutionId={matchResolutionId} apiKey={props.apiKey}>{
          ({ setData }) => <>
            <Async.Pending><Loader /></Async.Pending>
            <Async.Rejected>{e => <ErrorMessage error={e} />}</Async.Rejected>
            <Async.Fulfilled<ManageMatchResolutionPageData>>{data => <>
              <Section name="Match Resolution Data" id="intro">
                <div className="my-3">
                  <ManageMatchResolution
                    matchResolution={data.matchResolution}
                    tournamentData={data.tournamentData}
                    tournamentSubmission={data.tournamentSubmission}
                    opponentTournamentSubmission={data.opponentTournamentSubmission}
                  />
                </div>
              </Section>
              <Section name="Logs" id="logs">
                <div>
                  <h6>Submission Stdout</h6>
                  <div style={{ width: "100%", overflow: "scroll" }}>
                    <SyntaxHighligher
                      showLineNumbers
                      style={a11yDark}
                      children={data.matchResolution.stdout} />
                  </div>
                  <h6>Submission Stderr</h6>
                  <div style={{ width: "100%", overflow: "scroll" }}>
                    <SyntaxHighligher
                      showLineNumbers
                      style={a11yDark}
                      children={data.matchResolution.stderr} />
                  </div>
                </div>
              </Section>
            </>}
            </Async.Fulfilled>
          </>}
        </Async>
      </Container>
    </DashboardLayout>
  )
}

export default ManageMatchResolutionPage;
