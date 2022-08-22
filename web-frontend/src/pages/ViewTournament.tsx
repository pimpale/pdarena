import { Alert, Button, Card, Container, Form, Table } from 'react-bootstrap';
import DashboardLayout from '../components/DashboardLayout';
import { Loader, WidgetWrapper, Link, Section } from '@innexgo/common-react-components';
import ManageTournamentData from '../components/ManageTournamentData';
import ErrorMessage from '../components/ErrorMessage';

import update from 'immutability-helper';

import { unwrap, getFirstOr } from '@innexgo/frontend-common';

import format from "date-fns/format";

import { Async, AsyncProps } from 'react-async';
import { MatchResolution, MatchResolutionLite, matchResolutionLiteStream, matchResolutionView, Submission, submissionView, TournamentData, tournamentDataView, TournamentSubmission, tournamentSubmissionView } from '../utils/api';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { AuthenticatedComponentProps } from '@innexgo/auth-react-components';
import ManageTournamentSubmissionsTournament from '../components/ManageTournamentSubmissionTournament';
import CrossTable, { LookupTable, lookupTableWebsocketGenerator } from '../components/CrossTable';
import React from 'react';

type ManageTournamentPageData = {
  tournamentData: TournamentData,
  tournamentSubmissions: TournamentSubmission[],
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

  return {
    tournamentData,
    tournamentSubmissions,
  };
}


function ManageTournamentPageInner(props: {
  apiKey: ApiKey,
  tournamentData: TournamentData,
  setTournamentData: (td: TournamentData) => void,
  tournamentSubmissions: TournamentSubmission[],
  setTournamentSubmissions: (ts: TournamentSubmission[]) => void,
}) {
  // the websocket
  const [ws, setWs] = React.useState<WebSocket | undefined>(undefined);
  // whether or not the websocket is closed
  const [wsOk, setWsOk] = React.useState(true);

  const [lookupTable, setLookupTable] = React.useState<LookupTable>(new Map());


  if (ws === undefined) {
    const new_ws = matchResolutionLiteStream({
      submissionId: props.tournamentSubmissions.map(x => x.submissionId),
      onlyRecent: true,
      apiKey: props.apiKey.key
    });
    new_ws.addEventListener('open', () => setWsOk(true));
    new_ws.addEventListener('message', lookupTableWebsocketGenerator(setLookupTable));
    new_ws.addEventListener('error', () => setWsOk(false));
    new_ws.addEventListener('close', () => setWsOk(false));
    // set ws for next time
    setWs(new_ws);
  }

  return <>
    {wsOk
      ? null
      : <Alert variant="danger" className='d-flex justify-content-center'>
        <span>WebSocket connection failed!</span>
        {
          ws?.readyState === WebSocket.CONNECTING
            ? <div className='ms-auto'><Loader /></div>
            : <Button
              variant="outline-danger"
              className='ms-auto'
              onClick={() => setWs(undefined)}
              children="Reconnect"
            />
        }
      </Alert>
    }
    <Section name="Tournament Data" id="intro">
      <div className="my-3">
        <ManageTournamentData
          tournamentData={props.tournamentData}
          setTournamentData={props.setTournamentData}
          apiKey={props.apiKey}
        />
      </div>
    </Section>
    <Section name="Table" id="table">
      <b>Note:</b> submissions are on the columns, opponents are on the rows.
      <div className="text-center p-3" style={{ overflow: "scroll" }}>
        <CrossTable
          tournamentData={props.tournamentData}
          tournamentSubmissions={props.tournamentSubmissions}
          matches={lookupTable}
        />
      </div>
    </Section>
    <Section name="Leaderboard" id="leaderboard">
      <ManageTournamentSubmissionsTournament
        tournamentData={props.tournamentData}
        tournamentSubmissions={props.tournamentSubmissions}
        setTournamentSubmissions={props.setTournamentSubmissions}
        apiKey={props.apiKey}
        matches={lookupTable}
        showInactive={false}
        mutable={true}
      />
    </Section>
    <div className="text-center">
      <a className="btn btn-primary mx-3" href={`/compete?tournamentId=${props.tournamentData.tournament.tournamentId}&kind=VALIDATE`}>
        Compete!
      </a>
      <a className="btn btn-primary mx-3" href={`/compete?tournamentId=${props.tournamentData.tournament.tournamentId}&kind=TESTCASE`} hidden={props.apiKey.creatorUserId !== props.tournamentData.tournament.creatorUserId}>
        Write a Testcase!
      </a>
    </div>
  </>
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
            <Async.Fulfilled<ManageTournamentPageData>>{data =>
              <ManageTournamentPageInner
                {...data}
                apiKey={props.apiKey}
                setTournamentData={td => setData(update(data, { tournamentData: { $set: td } }))}
                setTournamentSubmissions={tournamentSubmissions => setData(update(data, { tournamentSubmissions: { $set: tournamentSubmissions } }))}
              />
            }</Async.Fulfilled>
          </>}
        </Async>
      </Container>
    </DashboardLayout>
  )
}


export default ManageTournamentPage;
