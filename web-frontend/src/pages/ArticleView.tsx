import React from 'react';
import { Button, Container, Card } from 'react-bootstrap';
import { Async, AsyncProps } from 'react-async';
import update from 'immutability-helper';
import { Section, Loader, BrandedComponentProps } from '@innexgo/common-react-components';
import ErrorMessage from '../components/ErrorMessage';
import ExternalLayout from '../components/ExternalLayout';

import { ArticleData, ArticleSection, articleDataViewPublic, articleSectionViewPublic } from '../utils/api';
import { unwrap, getFirstOr } from '@innexgo/frontend-common';
import format from 'date-fns/format';
import formatDistance from 'date-fns/formatDistance';
import { useSearchParams } from 'react-router-dom'
import { animated, Controller } from '@react-spring/web'

type SelectedSection = {
  section: ArticleSection,
  marked: boolean
  selected: boolean
}

type ManageArticleSectionOptionProps = {
  articleData: ArticleData,
  section: SelectedSection,
  setSection: (s: SelectedSection) => void
};

class ManageArticleSectionOption extends React.Component<ManageArticleSectionOptionProps, {}>  {

  private controller: Controller<{ opacity: number }> | Controller<{ translateX: number }>;

  constructor(props: ManageArticleSectionOptionProps) {
    super(props);
    if (props.section.section.variant === 0) {
      this.controller = new Controller({
        from: { opacity: 1 },
        to: { opacity: 0 }
      });
    } else {
      this.controller = new Controller({
        config: {
          frequency: 0.1,
          damping: 0.1
        },
        from: { translateX: -5 },
        to: { translateX: 5 },
      })
    }
    this.controller.pause();
  }

  componentDidUpdate() {
    if (this.props.section.marked) {
      this.controller.resume();
      setTimeout(() => {
        this.props.setSection(update(this.props.section, { selected: { $set: true } }))
      }, 1000);
    }
  }

  render() {
    return <animated.div style={this.controller.springs} className="col-xl p-3" >
      <Card className="w-100"
        border={
          this.props.section.marked
            ? this.props.section.section.variant === 0
              ? "success"
              : "danger"
            : undefined
        }
      >
        <Card.Body>
          <Card.Text>
            {this.props.section.section.sectionText}
          </Card.Text>
          <Button
            variant="primary"
            disabled={this.props.section.marked}
            onClick={() =>
              // we mark it, so the animation can run. the animation (once done) selects it
              this.props.setSection(update(this.props.section, { marked: { $set: true } }))
            }
          >
            Choose
          </Button>
        </Card.Body>
      </Card>
    </animated.div>
  }
}

type ManageArticleSectionOptionsProps = {
  articleData: ArticleData,
  position: number,
  sections: SelectedSection[],
  setSection: (i: number, s: SelectedSection) => void
};


function ManageArticleSectionOptions(props: ManageArticleSectionOptionsProps) {
  const options = props.sections
    .map((section, originalId) => ({ section, originalId }))
    .filter(s => s.section.section.position === props.position + 1)
    .sort((a, b) => a.section.section.sectionText.localeCompare(b.section.section.sectionText));

  const previousSelections = props.sections
    .filter(s => s.section.variant === 0 && s.section.position <= props.position);

  const finished = options.length === 0;

  return <div>
    <div style={{ maxWidth: "50rem" }} className="mx-auto">
      <h2>{props.articleData.title}</h2>
      {previousSelections.map((s, i) => <p key={i} children={s.section.sectionText} />)}
    </div>
    <h5 className="pt-5" hidden={finished}>
      Pick the true completion of the article:
    </h5>
    <div className="pt-5" hidden={!finished}>
      <h4>
        Completed Article!
      </h4>
    </div>
    <div className="row px-5">
      {options.map(s =>
        <ManageArticleSectionOption
          key={s.originalId}
          articleData={props.articleData}
          section={s.section}
          setSection={sec => props.setSection(s.originalId, sec)}
        />
      )}
    </div>
  </div>
}


type Data = {
  articleData: ArticleData,
  sectionData: SelectedSection[],
}

const loadData = async (props: AsyncProps<Data>) => {
  const articleData =
    await articleDataViewPublic({
      articleId: [props.articleId],
    })
      .then(unwrap)
      .then(x => getFirstOr(x, "NOT_FOUND"))
      .then(unwrap);

  const articleSection =
    await articleSectionViewPublic({
      articleId: [props.articleId],
    })
      .then(unwrap);

  return {
    articleData,
    sectionData: articleSection.map(s => ({
      section: s,
      marked: false,
      selected: false,
    }))
  }
}

function ArticleView(props: BrandedComponentProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPosition = parseInt(searchParams.get("position") ?? "", 10) || 0;
  const [position, raw_setPosition] = React.useState(initialPosition);
  const articleId = parseInt(searchParams.get("articleId") ?? "", 10);
  const setPosition = (n: number) => {
    setSearchParams(
      {
        articleId: articleId.toString(),
        position: n.toString(),
      },
      {
        replace: true
      }
    );
    raw_setPosition(n);
  }

  return <ExternalLayout branding={props.branding} fixed={false} transparentTop={true}>
    <Container className="py-4">
      <Async promiseFn={loadData} articleId={articleId}>
        {({ setData }) => <>
          <Async.Pending><Loader /></Async.Pending>
          <Async.Rejected>
            {e => <ErrorMessage error={e} />}
          </Async.Rejected>
          <Async.Fulfilled<Data>>{d => <ManageArticleSectionOptions
            key={position}
            articleData={d.articleData}
            position={position}
            sections={d.sectionData}
            setSection={(i, s) => {
              if (s.section.variant === 0 && s.selected) {
                setPosition(position + 1);
              }
              setData(update(d, { sectionData: { [i]: { $set: s } } }));
            }}
          />}
          </Async.Fulfilled>
        </>}
      </Async>
    </Container>
  </ExternalLayout>
}

export default ArticleView;
