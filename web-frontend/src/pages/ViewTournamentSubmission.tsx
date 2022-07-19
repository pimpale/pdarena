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

import ArchiveTournamentSubmission from '../components/ArchiveTournamentSubmission';
import SubmitTournamentSubmission from '../components/SubmitTournamentSubmission';
import EditTournamentSubmission from '../components/EditTournamentSubmission';

import { Pencil as EditIcon, X as DeleteIcon, Eye as ViewIcon, Mailbox as SubmitIcon } from 'react-bootstrap-icons';

import { ROUNDS, score } from '../utils/scoring';

type ManageTournamentSubmissionPageData = {
  tournamentData: TournamentData,
  tournamentSubmission: TournamentSubmission,
  submission?: Submission,
  matchesAsSubmission: MatchResolution[]
  matchesAsOpponent: MatchResolution[]
  tournamentSubmissions: TournamentSubmission[],
}

const loadManageTournamentSubmissionPage = async (props: AsyncProps<ManageTournamentSubmissionPageData>): Promise<ManageTournamentSubmissionPageData> => {
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


  const matchesAsSubmission = await matchResolutionView({
    submissionId: [props.submissionId],
    apiKey: props.apiKey.key
  })
    .then(unwrap);

  const matchesAsOpponent = await matchResolutionView({
    opponentSubmissionId: [props.submissionId],
    apiKey: props.apiKey.key
  })
    .then(unwrap);

  return {
    tournamentData,
    tournamentSubmission,
    tournamentSubmissions,
    submission,
    matchesAsSubmission,
    matchesAsOpponent
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



function ShowMatchupTable(props: ShowVerifyProgressProps) {
  const [inspectedMatchs, setInspectedMatchs] = React.useState<[MatchResolution, MatchResolution] | null>(null);


  // find all matches that have self as submission and testcase submissions as opponents
  const selfSubmissionId = props.tournamentSubmission.submissionId;

  // group by opponent
  const opponentMap1 = new Map<number, MatchResolution[]>();

  for (const match of props.matchesAsSubmission) {
    const result = opponentMap1.get(match.opponentSubmissionId);
    if (result === undefined) {
      opponentMap1.set(match.opponentSubmissionId, [match]);
    } else {
      result.push(match);
    }
  }

  const opponentMap2 = new Map<number, MatchResolution[]>();
  for (const match of props.matchesAsOpponent) {
    const result = opponentMap2.get(match.submissionId);
    if (result === undefined) {
      opponentMap2.set(match.submissionId, [match]);
    } else {
      result.push(match);
    }
  }

  // for each match-set group into pairs
  const entries: { ts: TournamentSubmission, ms: Entry[], score: number, disqualified: boolean }[] = [];

  for (const k of new Set([...opponentMap1.keys(), ...opponentMap2.keys()])) {
    const ts = props.tournamentSubmissions.find(x => x.submissionId === k)!;

    const r1 = opponentMap1.get(k);
    const r2 = opponentMap2.get(k);

    if (r1 && r2) {
      const ms: Entry[] = [];
      for (const m1 of r1) {
        const m2 = r2.find(x => x.round === m1.round);
        if (m2) {
          let m_score: number | undefined = undefined;
          if (m1.defected !== null && m2.defected !== null) {
            m_score = score(m1.defected, m2.defected);
          }
          ms[m1.round] = { m1, m2, m_score };
        }
      }

      const scores = ms.filter(({ m_score }) => m_score !== undefined).map(({ m_score }) => m_score || 0);

      const disqualified = ms.some(({ m_score }) => m_score === undefined);

      const scoreV = scores.reduce((a, b) => a + b, 0) / scores.length;
      entries.push({ ts, ms, score: scoreV, disqualified });
    }
  }

  return <Table hover bordered>
    <thead>
      <tr>
        <th>Opponent</th>
        <th>Score</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody>{entries.map(entry =>
      <tr key={entry.ts.tournamentSubmissionId}>
        <td>
          <h5>{entry.ts.name}</h5>
          <b>{entry.ts.kind}</b>
        </td>
        <td>
          <p>
            ({entry.ms.length}/{ROUNDS})
            Avg: {isNaN(entry.score)
              ? "N/A"
              : entry.score.toFixed(3)
            }</p>
          <p>{entry.disqualified
            ? <>
              <b className="text-danger">MATCH DISQUALIFIED</b>
              <p>(one or more matches failed)</p>
            </>
            : entry.ms.length < ROUNDS
              ? <b className="text-secondary">MATCH IN PROGRESS</b>
              : <b className="text-success">MATCH VALID</b>
          }</p>
        </td>
        <td>
          <ToggleableElement>
            <Table hover bordered>
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Submission Choice?</th>
                  <th>Opponent Choice?</th>
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entry.ms.map(({ m1, m2, m_score }, round) =>
                  <tr>
                    <td>{round}</td>
                    <td>{m1.defected === null
                      ? "?"
                      : m1.defected === true
                        ? "Defected"
                        : "Cooperated"
                    }</td>
                    <td>{m2.defected === null
                      ? "?"
                      : m2.defected === true
                        ? "Defected"
                        : "Cooperated"
                    }</td>
                    <td>{m_score}</td>
                    <td>
                      <Action
                        title="View"
                        icon={ViewIcon}
                        onClick={() => setInspectedMatchs([m1, m2])}
                      />
                    </td>
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
        : <div>
          <h6>Submission Stdout</h6>
          <div style={{ width: "100%", overflow: "scroll" }}>
            <SyntaxHighligher
              showLineNumbers
              style={a11yDark}
              children={inspectedMatchs[0].stdout} />
          </div>
          <h6>Opponent Stdout</h6>
          <div style={{ width: "100%", overflow: "scroll" }}>
          <SyntaxHighligher
            showLineNumbers
            style={a11yDark}
            children={inspectedMatchs[1].stdout} />
          </div>
          <h6>Submission Stderr</h6>
          <div style={{ width: "100%", overflow: "scroll" }}>
          <SyntaxHighligher
            showLineNumbers
            style={a11yDark}
            children={inspectedMatchs[0].stderr} />
          </div>
          <h6>Submission Stderr</h6>
          <div style={{ width: "100%", overflow: "scroll" }}>
          <SyntaxHighligher
            showLineNumbers
            style={a11yDark}
            children={inspectedMatchs[1].stderr} />
          </div>
        </div>
      }
    </DisplayModal>
  </Table>
}

function ManageTournamentSubmissionPage(props: AuthenticatedComponentProps) {
  const tournamentId = parseInt(new URLSearchParams(window.location.search).get("tournamentId") ?? "");
  const submissionId = parseInt(new URLSearchParams(window.location.search).get("submissionId") ?? "");

  const [showEditTournamentSubmissionModal, setShowEditTournamentSubmissionModal] = React.useState(false);
  const [showCancelTournamentSubmissionModal, setShowCancelTournamentSubmissionModal] = React.useState(false);
  const [showSubmitTournamentSubmissionModal, setShowSubmitTournamentSubmissionModal] = React.useState(false);


  const key = new Map<TournamentSubmissionKind, string>();
  key.set("VALIDATE", "text-success");
  key.set("COMPETE", "text-primary");
  key.set("CANCEL", "text-secondary");
  key.set("TESTCASE", "text-success");

  return (
    <DashboardLayout {...props}>
      <Container fluid className="py-4 px-4">
        <Async promiseFn={loadManageTournamentSubmissionPage} tournamentId={tournamentId} submissionId={submissionId} apiKey={props.apiKey}>{
          ({ setData }) => <>
            <Async.Pending><Loader /></Async.Pending>
            <Async.Rejected>{e => <ErrorMessage error={e} />}</Async.Rejected>
            <Async.Fulfilled<ManageTournamentSubmissionPageData>>{data => <>
              <Section name={data.tournamentSubmission.name} id="intro">
                <h5>Status: <span className={key.get(data.tournamentSubmission.kind)}>{data.tournamentSubmission.kind}</span></h5>
                {data.submission === undefined
                  ? <HiddenCodeCard className='mx-5 mb-5' />
                  : <SyntaxHighligher
                    className="mx-5 mb-5 h-100"
                    showLineNumbers
                    language="python"
                    style={a11yDark}
                    children={data.submission.code} />
                }
                <div className="m-3" hidden={data.submission === undefined}>
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
                <p hidden={data.tournamentSubmission.kind !== "VALIDATE"}>
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
                <DisplayModal
                  title="Submit Tournament Submission"
                  show={showSubmitTournamentSubmissionModal}
                  onClose={() => setShowSubmitTournamentSubmissionModal(false)}
                >
                  <SubmitTournamentSubmission
                    tournamentSubmission={data.tournamentSubmission}
                    setTournamentSubmission={ts => {
                      setData(update(data, { tournamentSubmission: { $set: ts } }))
                      setShowSubmitTournamentSubmissionModal(false);
                    }}
                    apiKey={props.apiKey}
                  />
                </DisplayModal>
              </Section>
              <Section name="Matchups" id="matchups">
                <ShowMatchupTable
                  tournamentSubmission={data.tournamentSubmission}
                  tournamentSubmissions={data.tournamentSubmissions}
                  matchesAsSubmission={data.matchesAsSubmission}
                  matchesAsOpponent={data.matchesAsOpponent}
                />
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
