import { Card, Row, Container, Col } from 'react-bootstrap';
import { Async, AsyncProps } from 'react-async';
import update from 'immutability-helper';
import { Section, Loader, } from '@innexgo/common-react-components';
import ErrorMessage from '../components/ErrorMessage';
import ExternalLayout from '../components/ExternalLayout';

import { unwrap } from '@innexgo/frontend-common';
import format from 'date-fns/format';
import formatDistance from 'date-fns/formatDistance';
import AuthenticatedComponentProps from '@innexgo/auth-react-components/lib/components/AuthenticatedComponentProps';

import { TournamentData, tournamentDataView } from '../utils/api';
import { DefaultSidebarLayout } from '@innexgo/auth-react-components';
import DashboardLayout from '../components/DashboardLayout';

type Data = {
  tournamentData: ArticleData[],
}

const loadData = async (props: AsyncProps<Data>) => {
  const tournamentData =
    await tournamentDataView({
      apiKey: props.apiKey
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


function Dashboard(props: AuthenticatedComponentProps) {
  return <DashboardLayout {...props}>
    <Container fluid className="py-4 px-4">
      <Section id="tournaments" name="My Tournaments">
        <Async promiseFn={loadData}>
          {({ setData }) => <>
            <Async.Pending><Loader /></Async.Pending>
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
                      text={`Approx Length: ${formatDistance(0, a.durationEstimate)}`}
                      subtitle={`Updated ${format(a.creationTime, 'yyyy MMM do')}`}
                      href={`/tournament_view?tournamentId=${a.tournament.tournamentId}`}
                    />
                  )
                }
              </div>}
            </Async.Fulfilled>
          </>}
        </Async>
      </Section>
    </Container>
  </DashboardLayout>
}

export default Dashboard;
