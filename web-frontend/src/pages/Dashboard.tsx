import { Card, Row, Container, Col, Spinner } from 'react-bootstrap';
import { Async, AsyncProps } from 'react-async';
import update from 'immutability-helper';
import { Section, AddButton, DisplayModal, } from '@innexgo/common-react-components';
import ErrorMessage from '../components/ErrorMessage';
import ExternalLayout from '../components/ExternalLayout';

import { unwrap } from '@innexgo/frontend-common';
import format from 'date-fns/format';
import formatDistance from 'date-fns/formatDistance';
import AuthenticatedComponentProps from '@innexgo/auth-react-components/lib/components/AuthenticatedComponentProps';

import { TournamentData, tournamentDataView } from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import React from 'react';
import CreateTournament from '../components/CreateTournament';

type Data = {
  tournamentData: TournamentData[],
}

const loadData = async (props: AsyncProps<Data>) => {
  const tournamentData =
    await tournamentDataView({
      onlyRecent: true,
      apiKey: props.apiKey.key
    })
      .then(unwrap);

  return {
    tournamentData,
  }
}


type ResourceCardProps = {
  className?: string,
  title: string,
  subtitle: string,
  text: string,
  href: string
}

function ResourceCard(props: ResourceCardProps) {
  return (
    <Card style={{ width: '15rem' }} className={props.className}>
      <Card.Body>
        <Card.Title>{props.title}</Card.Title>
        <Card.Subtitle className="text-muted">{props.subtitle}</Card.Subtitle>
        <Card.Text>{props.text}</Card.Text>
        <Card.Link href={props.href} className="stretched-link" />
      </Card.Body>
    </Card>
  )
}

type AddNewCardProps = {
  className?: string,
  setShow: (a: boolean) => void,
};

const AddNewCard = (props: AddNewCardProps) =>
  <div className={props.className} style={{ width: "15rem", height: "100%" }}>
    <AddButton onClick={() => props.setShow(true)} />
  </div>


function Dashboard(props: AuthenticatedComponentProps) {

  const [showNewTournamentModal, setShowNewTournamentModal] = React.useState(false);

  return <DashboardLayout {...props}>
    <Container fluid className="py-4 px-4">
      <Section id="tournaments" name="My Tournaments">
        <Async promiseFn={loadData} apiKey={props.apiKey}>
          {({ setData }) => <>
            <Async.Pending>
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </Async.Pending>
            <Async.Rejected>
              {e => <ErrorMessage error={e} />}
            </Async.Rejected>
            <Async.Fulfilled<Data>>{d =>
              <div className="d-flex flex-wrap">
                {
                  d.tournamentData.map(a =>
                    <ResourceCard
                      key={a.tournamentDataId}
                      className="m-2"
                      title={a.title}
                      subtitle={a.description}
                      text={`Created ${format(a.creationTime, "MMM d, Y")}`}
                      href={`/tournament?tournamentId=${a.tournament.tournamentId}`}
                    />
                  )
                }
                <AddNewCard className="m-2" setShow={setShowNewTournamentModal} />
                <DisplayModal
                  title="Create New Tournament"
                  show={showNewTournamentModal}
                  onClose={() => setShowNewTournamentModal(false)}
                >
                  <CreateTournament apiKey={props.apiKey}
                    postSubmit={(td) => {
                      setShowNewTournamentModal(false);
                      setData(update(d, { tournamentData: { $push: [td] } }));
                    }}
                  />
                </DisplayModal>
              </div>}
            </Async.Fulfilled>
          </>}
        </Async>
      </Section>
    </Container>
  </DashboardLayout>
}

export default Dashboard;
