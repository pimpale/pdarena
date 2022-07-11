import React from 'react';
import { Card, Row, Container, Col, } from 'react-bootstrap';
import { Async, AsyncProps } from 'react-async';
import update from 'immutability-helper';
import { Section, Loader, AddButton, DisplayModal, } from '@innexgo/common-react-components';
import ErrorMessage from '../components/ErrorMessage';
import ExternalLayout from '../components/ExternalLayout';
import { getFirstOr, unwrap } from '@innexgo/frontend-common';
import AuthenticatedComponentProps from '@innexgo/auth-react-components/lib/components/AuthenticatedComponentProps';
import CreateTournamentSubmission from '../components/CreateTournamentSubmission';
import { DefaultSidebarLayout } from '@innexgo/auth-react-components';
import DashboardLayout from '../components/DashboardLayout';
import PythonEditor from '../components/PythonEditor';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { TournamentData, tournamentDataView } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const defaultCode = `# Example of a Tit-For-Tat Bot:
def should_defect(opp_defection_function, opponent_defection_history):
    if len(opponent_defection_history) > 0:
        return opponent_defection_history[-1]
    else:
        return False
`

type InnerCompetePageProps = {
  kind: ("VALIDATE" | "TESTCASE")
  apiKey: ApiKey,
  tournamentData: TournamentData,
}

function InnerCompetePage(props: InnerCompetePageProps) {
  const [code, setCode] = React.useState("");
  const [showSubmitModal, setShowSubmitModal] = React.useState(false);
  const navigate = useNavigate();

  const title = props.kind === "VALIDATE"
    ? "Submit Competing Entry"
    : "Submit Testcase";

  return <div style={{ position: 'relative', height: "100vh" }}>
    <PythonEditor
      initialCode={defaultCode}
      onChange={setCode}
    />
    <button
      style={{
        position: "absolute",
        bottom: "2rem",
        left: "2rem"
      }}
      className='btn btn-primary'
      onClick={() => setShowSubmitModal(true)}
    >
      Submit
    </button>
    <DisplayModal
      title={title}
      show={showSubmitModal}
      onClose={() => setShowSubmitModal(false)}
    >
      <CreateTournamentSubmission
        code={code}
        kind={props.kind}
        apiKey={props.apiKey}
        tournamentData={props.tournamentData}
        postSubmit={ts => navigate(`/tournament_submission?tournamentId=${ts.tournament.tournamentId}&submissionId=${ts.submissionId}`)}
      />
    </DisplayModal>
  </div>
}

type CompetePageData = {
  tournamentData: TournamentData,
}

const loadCompetePageData = async (props: AsyncProps<CompetePageData>): Promise<CompetePageData> => {
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
  };
}


function CompetePage(props: AuthenticatedComponentProps) {
  const tournamentId = parseInt(new URLSearchParams(window.location.search).get("tournamentId") ?? "");
  const kind = new URLSearchParams(window.location.search).get("kind");

  if (kind !== "VALIDATE" && kind !== "TESTCASE") {
    return <ErrorMessage error={new Error("Unknown submission type")} />
  }

  return <DashboardLayout {...props} >
    <Async promiseFn={loadCompetePageData} apiKey={props.apiKey} tournamentId={tournamentId}>
      <Async.Pending><Loader /></Async.Pending>
      <Async.Rejected>{e => <ErrorMessage error={e} />}</Async.Rejected>
      <Async.Fulfilled<CompetePageData>>{d =>
        <InnerCompetePage apiKey={props.apiKey} tournamentData={d.tournamentData} kind={kind} />
      }</Async.Fulfilled>
    </Async>
  </DashboardLayout>
}

export default CompetePage;
