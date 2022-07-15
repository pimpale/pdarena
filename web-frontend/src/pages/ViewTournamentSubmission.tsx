import React from 'react';

import { Card, Container, Form, Table } from 'react-bootstrap';
import DashboardLayout from '../components/DashboardLayout';
import { Loader, WidgetWrapper, Link, Section, DisplayModal, Action } from '@innexgo/common-react-components';
import ErrorMessage from '../components/ErrorMessage';

import update from 'immutability-helper';

import { unwrap, getFirstOr } from '@innexgo/frontend-common';

import format from "date-fns/format";

import { Async, AsyncProps } from 'react-async';
import { MatchResolution, matchResolutionView, Submission, submissionView, TournamentData, tournamentDataView, TournamentSubmission, tournamentSubmissionView } from '../utils/api';
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

function ShowMatchupTable(props: ShowVerifyProgressProps) {
  // find all matches that have self as submission and testcase submissions as opponents
  const selfSubmissionId = props.tournamentSubmission.submissionId;

  // group by opponent
  const opponentMap = new Map<number, MatchResolution[]>();

  for (const match of props.matchesAsSubmission) {
    const result = opponentMap.get(match.opponentSubmissionId);
    if (result === undefined) {
      opponentMap.set(match.opponentSubmissionId, [match]);
    } else {
      result.push(match);
    }
  }

  for (const match of props.matchesAsOpponent) {
    const result = opponentMap.get(match.submissionId);
    if (result === undefined) {
      opponentMap.set(match.submissionId, [match]);
    } else {
      result.push(match);
    }
  }

  // for each match-set group into pairs
  const entries: { ts: TournamentSubmission, ms: [MatchResolution | undefined, MatchResolution | undefined][] }[] = [];

  for (const [k, v] of opponentMap) {
    const key = props.tournamentSubmissions.find(x => x.submissionId === k)!;
    const pairs: [MatchResolution | undefined, MatchResolution | undefined][] = [];
    for (const m of v) {
      if (pairs[m.round] === undefined) {
        pairs[m.round] = [undefined, undefined];
      }
      if (m.submissionId === selfSubmissionId) {
        pairs[m.round][0] = m;
      } else {
        pairs[m.round][1] = m;
      }
    }
    entries.push({ ts: key, ms: pairs });
  }

  return <Table hover bordered>
    <thead>
      <tr>
        <th>Opponent</th>
        <th>Status</th>
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
        <td>ok?</td>
        <td>tbd</td>
        <td>
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
            <tbody>{entry.ms.map(([m1, m2], round) =>
              <tr>
                <td>{round}</td>
                <td>{m1?.defected === undefined
                  ? "?"
                  : m1.defected === true
                    ? "Defected"
                    : "Cooperated"
                }</td>
                <td>{m2?.defected === undefined
                  ? "?"
                  : m2.defected === true
                    ? "Defected"
                    : "Cooperated"
                }</td>
              </tr>
            )}</tbody>
          </Table>
        </td>
      </tr>
    )}</tbody>
  </Table>

}



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
