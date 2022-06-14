import { Card, Row, Container, Col } from 'react-bootstrap';
import { Async, AsyncProps } from 'react-async';
import update from 'immutability-helper';
import { Section, Loader, BrandedComponentProps } from '@innexgo/common-react-components';
import ErrorMessage from '../components/ErrorMessage';
import ExternalLayout from '../components/ExternalLayout';

import { ArticleData, articleDataViewPublic } from '../utils/api';
import { unwrap } from '@innexgo/frontend-common';
import format from 'date-fns/format';
import formatDistance from 'date-fns/formatDistance';

type Data = {
  articleData: ArticleData[],
}

const loadData = async (props: AsyncProps<Data>) => {
  const articleData =
    await articleDataViewPublic({})
      .then(unwrap);

  return {
    articleData,
  }
}


type ResourceCardProps = {
  className?:string,
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


function ArticleSearch(props: BrandedComponentProps) {
  return <ExternalLayout branding={props.branding} fixed={false} transparentTop={true}>
    <Container className="py-4">
      <Section id="goalIntents" name="Articles">
        <Async promiseFn={loadData}>
          {({ setData }) => <>
            <Async.Pending><Loader /></Async.Pending>
            <Async.Rejected>
              {e => <ErrorMessage error={e} />}
            </Async.Rejected>
            <Async.Fulfilled<Data>>{d =>
              <div className="d-flex flex-wrap">
                {
                  d.articleData.map(a =>
                      <ResourceCard
                        key={a.articleDataId}
                        className="m-2"
                        title={a.title}
                        text={`Approx Length: ${formatDistance(0, a.durationEstimate)}`}
                        subtitle={`Updated ${format(a.creationTime, 'yyyy MMM do')}`}
                        href={`/article_view?articleId=${a.article.articleId}`}
                      />
                  )
                }
              </div>}
            </Async.Fulfilled>
          </>}
        </Async>
      </Section>
    </Container>
  </ExternalLayout>
}

export default ArticleSearch;
