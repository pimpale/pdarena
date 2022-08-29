import React, { CSSProperties } from 'react';

import { Card, Container, Form, Spinner, Table } from 'react-bootstrap';
import DashboardLayout from '../components/DashboardLayout';
import { WidgetWrapper, Link, Section, DisplayModal, Action } from '@innexgo/common-react-components';
import ErrorMessage from '../components/ErrorMessage';

import update from 'immutability-helper';

import { unwrap, getFirstOr } from '@innexgo/frontend-common';

import format from "date-fns/format";

import { Async, AsyncProps } from 'react-async';
import { MatchResolution, MatchResolutionLite, matchResolutionLiteStream, matchResolutionView, Submission, submissionView, TournamentData, tournamentDataView, TournamentSubmission, TournamentSubmissionKind, tournamentSubmissionView } from '../utils/api';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { AuthenticatedComponentProps } from '@innexgo/auth-react-components';


import { Prism as SyntaxHighligher } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import SubmitTournamentSubmission from '../components/SubmitTournamentSubmission';

import { XLg as ErrorIcon, Eye as ViewIcon, Mailbox as SubmitIcon } from 'react-bootstrap-icons';
import { ResolvedTypeReferenceDirectiveWithFailedLookupLocations } from 'typescript';
import { getBackgroundColor, LookupTable, lookupTableWebsocketGenerator, scoreMatchups, tournamentSubmissionColors } from '../components/CrossTable';
import ManageTournamentSubmission from '../components/ManageTournamentSubmission';

type ManageTournamentSubmissionPageData = {
  tournamentData: TournamentData,
  tournamentSubmission: TournamentSubmission,
  tournamentSubmissions: TournamentSubmission[],
  submission?: Submission,
}

const loadManageTournamentSubmissionPage = async (props: AsyncProps<ManageTournamentSubmissionPageData>): Promise<ManageTournamentSubmissionPageData> => {

  // const tournamentSubmission = await tournamentSubmissionView({
  //   tournamentId: [props.tournamentId],
  //   submissionId: [props.submissionId],
  //   onlyRecent: true,
  //   apiKey: props.apiKey.key
  // })
  //   .then(unwrap)
  //   .then(x => getFirstOr(x, "NOT_FOUND"))
  //   .then(unwrap);


  const tournamentSubmissions = await tournamentSubmissionView({
    tournamentId: [props.tournamentId],
    onlyRecent: true,
    apiKey: props.apiKey.key
  })
    .then(unwrap);

  const tournamentSubmission = tournamentSubmissions.find(x => x.submissionId === props.submissionId);
  if (tournamentSubmission === undefined) {
    throw "NOT_FOUND";
  }


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
    tournamentSubmissions,
    submission,
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


type ToggleableElementProps = {
  children: React.ReactNode,
}

const ToggleableElement = (props: ToggleableElementProps) => {
  const [expanded, setExpanded] = React.useState(false);

  const expandedStyle = {}

  const opacity = 0.0;

  const compressedStyle: CSSProperties = {
    overflowY: "hidden" as const,
    maxHeight: "10rem",
    mask: `linear-gradient(180deg, black, rgba(255, 255, 255, ${opacity})) center bottom/100% 5rem no-repeat, linear-gradient(180deg, black, black) center top/100% calc(100% - 5rem) no-repeat`,
    WebkitMask: `linear-gradient(180deg, black, rgba(255, 255, 255, ${opacity})) center bottom/100% 5rem no-repeat, linear-gradient(180deg, black, black) center top/100% calc(100% - 5rem) no-repeat`
  }

  return <div className='text-center'>
    <div style={expanded ? expandedStyle : compressedStyle} >
      {props.children}
    </div>
    <button className='btn btn-primary' onClick={() => setExpanded(!expanded)}>{expanded ? "Hide" : "Show"}</button>
  </div>
}


type ShowVerifyProgressProps = {
  tournamentData: TournamentData,
  tournamentSubmission: TournamentSubmission,
  tournamentSubmissions: TournamentSubmission[],
  matches: LookupTable,
}

function ShowMatchupTable(props: ShowVerifyProgressProps) {
  const [inspectedMatchs, setInspectedMatchs] = React.useState<[MatchResolutionLite | undefined, MatchResolutionLite | undefined] | null>(null);

  const entries = props.tournamentSubmissions
    .map(ts => ({
      ts,
      ms: scoreMatchups(
        props.tournamentData,
        props.matches,
        props.tournamentSubmission,
        ts
      )
    }));

  return <Table hover bordered style={{ display: "block", tableLayout: "fixed" }}>
    <thead>
      <tr>
        <th>Opponent</th>
        <th>Opponent Status</th>
        <th>Score</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody>{entries.map(entry =>
      <tr key={entry.ts.tournamentSubmissionId}>
        <td>
          <h5>{entry.ts.name}</h5>
        </td>
        <td>
          <h5
            className={tournamentSubmissionColors.get(entry.ts.kind)}
            children={entry.ts.kind}
          />
        </td>
        <td>
          <p>{isNaN(entry.ms.avgScore)
            ? "N/A"
            : entry.ms.avgScore.toFixed(3)
          }</p>
          <p>{entry.ms.disqualified
            ? entry.ms.entries.some(r => r.some(x => !(x.submission && x.opponent)))
              ? <>
                <b className="text-secondary">MATCH NOT BEING COUNTED</b>
                <br />
                <span>(one or more matches haven't finished yet)</span>
              </>
              : <>
                <b className="text-danger">MATCH DISQUALIFIED</b>
                <br />
                <span>(one or more matches failed)</span>
              </>
            : entry.ms.nEntries < props.tournamentData.nRounds * props.tournamentData.nMatchups
              ? <>
                <b className="text-secondary">MATCH IN PROGRESS</b>
                ({entry.ms.nEntries} of {(props.tournamentData.nRounds * props.tournamentData.nMatchups)} complete)
              </>
              : <b className="text-success">MATCH VALID</b>
          }</p>
        </td>
        <td>
          <ToggleableElement>
            <Table bordered style={{ tableLayout: "fixed", width: `${9 + 2 * props.tournamentData.nRounds}rem` }}>
              <colgroup>
                <col style={{ width: "9rem" }} />
                {
                  new Array(props.tournamentData.nRounds)
                    .fill(undefined)
                    .map((_, i) =>
                      <col style={{ width: "2rem" }} />
                    )
                }
              </colgroup>
              <tbody>
                <tr>
                  <td />
                  <th colSpan={props.tournamentData.nRounds}>Rounds</th>
                </tr>
                <tr>
                  <th>Matchups</th>
                  {
                    new Array(props.tournamentData.nRounds)
                      .fill(undefined)
                      .map((_, i) =>
                        <th key={i}>{i}</th>
                      )
                  }
                </tr>
                {entry.ms.entries.map((row, matchup) =>
                  <tr key={matchup}>
                    <th>{matchup}</th>
                    {row.map(({ submission, opponent, score }, round) =>
                      submission || opponent
                        ? <td key={round}
                          className="px-0"
                          style={{
                            cursor: "pointer",
                            backgroundColor:
                              score === undefined
                                ? undefined
                                : getBackgroundColor(score)
                          }}
                          onClick={() => setInspectedMatchs([submission, opponent])}
                          children={
                            submission && opponent
                              ? score
                                ? score
                                : <ErrorIcon style={{ color: "red" }} />
                              : <Spinner animation="border" role="status" size="sm">
                                <span className="visually-hidden">Loading...</span>
                              </Spinner>
                          }
                        />
                        : <td key={round} />
                    )}
                  </tr>
                )}
              </tbody>
            </Table>
          </ToggleableElement>
        </td>
      </tr>
    )}</tbody>
    <DisplayModal
      title="View Match Logs"
      show={inspectedMatchs !== null}
      onClose={() => setInspectedMatchs(null)}
    >
      {inspectedMatchs === null
        ? null
        : <Table hover bordered>
          <thead>
            <tr>
              <td />
              <th>Choice</th>
              <th>Logs</th>
            </tr>
          </thead>
          <tbody>{inspectedMatchs.map((m, i) =>
            <tr key={i}>
              <th>{i == 0 ? "This Submission" : "Opponent Submission"}</th>
              {m === undefined
                ? <td colSpan={2} />
                : <>
                  <td>{
                    m.defected === null
                      ? "No Response"
                      : m.defected
                        ? "Defected"
                        : "Cooperated"
                  }</td>
                  <td>
                    <Link
                      title="Match Resolution Logs"
                      icon={ViewIcon}
                      href={`/match_resolution?tournamentId=${props.tournamentSubmission.tournament.tournamentId}&matchResolutionId=${m.matchResolutionId}`}
                    />
                  </td>
                </>
              }
            </tr>)
          }</tbody>
        </Table>
      }
    </DisplayModal >
  </Table >
}

function ManageTournamentSubmissionPageInner(props:
  ManageTournamentSubmissionPageData & {
    apiKey: ApiKey,
    setTournamentSubmission: (ts: TournamentSubmission) => void
  }
) {

  const [showSubmitTournamentSubmissionModal, setShowSubmitTournamentSubmissionModal] = React.useState(false);

  // the websocket
  const [ws, setWs] = React.useState<WebSocket | undefined>(undefined);
  // whether or not the websocket is closed
  const [wsClosed, setWsClosed] = React.useState(false);
  const [lookupTable, setLookupTable] = React.useState<LookupTable>([]);

  if (ws === undefined) {
    const new_ws = matchResolutionLiteStream({
      submissionId: props.tournamentSubmissions.map(x => x.submissionId),
      onlyRecent: true,
      apiKey: props.apiKey.key
    });
    new_ws.addEventListener('message', lookupTableWebsocketGenerator(setLookupTable));
    new_ws.addEventListener('close', () => setWsClosed(true));
    // set ws for next time
    setWs(new_ws);
  }

  return <>
    <Section name="View Tournament Submission" id="intro">
      <ManageTournamentSubmission
        tournamentSubmission={props.tournamentSubmission}
        setTournamentSubmission={props.setTournamentSubmission}
        tournamentData={props.tournamentData}
        apiKey={props.apiKey}
        mutable={props.submission !== undefined}
      />

      <p hidden={props.tournamentSubmission.kind !== "VALIDATE"}>
        <b>
          NOTE: your submission is still in validation mode.
          Once all testcases pass, you must submit it into the tournament.
        </b>
        <Action
          title="Submit"
          icon={SubmitIcon}
          onClick={() => setShowSubmitTournamentSubmissionModal(true)}
        />
      </p>
      <DisplayModal
        title="Submit Tournament Submission"
        show={showSubmitTournamentSubmissionModal}
        onClose={() => setShowSubmitTournamentSubmissionModal(false)}
      >
        <SubmitTournamentSubmission
          tournamentSubmission={props.tournamentSubmission}
          setTournamentSubmission={ts => {
            props.setTournamentSubmission(ts);
            setShowSubmitTournamentSubmissionModal(false);
          }}
          apiKey={props.apiKey}
        />
      </DisplayModal>
    </Section>
    <div className="mt-3 mb-3" />
    <Section name="Code" id="code">
      {props.submission === undefined
        ? <HiddenCodeCard className='mx-4' />
        : <SyntaxHighligher
          className="mx-4 h-100"
          showLineNumbers
          language="python"
          style={a11yDark}
          children={props.submission.code} />
      }
    </Section>
    <div className="mt-3 mb-3" />
    <Section name="Matchups" id="matchups">
      <div className='d-flex' style={{ overflowX: "scroll" }}>
        <div className="mx-auto">
          <ShowMatchupTable
            tournamentData={props.tournamentData}
            tournamentSubmission={props.tournamentSubmission}
            tournamentSubmissions={props.tournamentSubmissions}
            matches={lookupTable}
          />
        </div>
      </div>
    </Section>
  </>
}

function ManageTournamentSubmissionPage(props: AuthenticatedComponentProps) {
  const tournamentId = parseInt(new URLSearchParams(window.location.search).get("tournamentId") ?? "");
  const submissionId = parseInt(new URLSearchParams(window.location.search).get("submissionId") ?? "");

  return (
    <DashboardLayout {...props}>
      <Container fluid className="py-4 px-4">
        <Async promiseFn={loadManageTournamentSubmissionPage} tournamentId={tournamentId} submissionId={submissionId} apiKey={props.apiKey}>{
          ({ setData }) => <>
            <Async.Pending>
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </Async.Pending>
            <Async.Rejected>{e => <ErrorMessage error={e} />}</Async.Rejected>
            <Async.Fulfilled<ManageTournamentSubmissionPageData>>{data =>
              <ManageTournamentSubmissionPageInner
                {...data}
                setTournamentSubmission={ts => setData(update(data, { tournamentSubmission: { $set: ts } }))}
                apiKey={props.apiKey}
              />
            }</Async.Fulfilled>
          </>}
        </Async>
      </Container>
    </DashboardLayout>
  )
}


export default ManageTournamentSubmissionPage;
