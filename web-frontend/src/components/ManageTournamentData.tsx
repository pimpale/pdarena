import React from 'react';
import { Form, Button, Table } from 'react-bootstrap';
import { Loader, Action, DisplayModal} from '@innexgo/common-react-components';
import { Async, AsyncProps } from 'react-async';
import { tournamentDataView, tournamentDataNew, TournamentData, } from '../utils/api';
import { ViewUser } from '../components/ViewData';
import { Pencil as EditIcon, X as DeleteIcon, BoxArrowUp as RestoreIcon } from 'react-bootstrap-icons';
import { Formik, FormikHelpers } from 'formik'
import format from 'date-fns/format';

import { isErr, unwrap } from '@innexgo/frontend-common';
import { User, ApiKey } from '@innexgo/frontend-auth-api';


type EditTournamentDataProps = {
  tournamentData: TournamentData,
  setTournamentData: (tournamentData: TournamentData) => void,
  apiKey: ApiKey,
};

function EditTournamentData(props: EditTournamentDataProps) {

  type EditTournamentDataValue = {
    title: string,
    description: string,
  }

  const onSubmit = async (values: EditTournamentDataValue,
    fprops: FormikHelpers<EditTournamentDataValue>) => {

    const maybeTournamentData = await tournamentDataNew({
      tournamentId: props.tournamentData.tournament.tournamentId,
      apiKey: props.apiKey.key,
      title: values.title,
      description: values.description,
      active: props.tournamentData.active,
    });

    if (isErr(maybeTournamentData)) {
      switch (maybeTournamentData.Err) {
        case "UNAUTHORIZED": {
          fprops.setStatus({
            failureResult: "You are not authorized to edit this tournament.",
            successResult: ""
          });
          break;
        }
        default: {
          fprops.setStatus({
            failureResult: "An unknown or network error has occured while modifying tournament data.",
            successResult: ""
          });
          break;
        }
      }
      return;
    }

    fprops.setStatus({
      failureResult: "",
      successResult: "Tournament Successfully Modified"
    });

    // execute callback
    props.setTournamentData(maybeTournamentData.Ok);
  }

  return <>
    <Formik<EditTournamentDataValue>
      onSubmit={onSubmit}
      initialValues={{
        title: props.tournamentData.title,
        description: props.tournamentData.description
      }}
      initialStatus={{
        failureResult: "",
        successResult: ""
      }}
    >
      {(fprops) => <>
        <Form
          noValidate
          onSubmit={fprops.handleSubmit} >
          <div hidden={fprops.status.successResult !== ""}>
            <Form.Group className="mb-3">
              <Form.Label>Tournament Name</Form.Label>
              <Form.Control
                name="title"
                type="text"
                placeholder="Tournament Title"
                as="input"
                value={fprops.values.title}
                onChange={e => fprops.setFieldValue("title", e.target.value)}
                isInvalid={!!fprops.errors.title}
              />
              <Form.Control.Feedback type="invalid">{fprops.errors.title}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label >Tournament Description</Form.Label>
              <Form.Control
                name="description"
                type="text"
                placeholder="Tournament Description"
                value={fprops.values.description}
                onChange={e => fprops.setFieldValue("description", e.target.value)}
                isInvalid={!!fprops.errors.description}
              />
              <Form.Control.Feedback type="invalid">{fprops.errors.description}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Button type="submit">Submit</Button>
            </Form.Group>
            <Form.Text className="text-danger">{fprops.status.failureResult}</Form.Text>
          </div>
          <Form.Text className="text-success">{fprops.status.successResult}</Form.Text>
        </Form>
      </>}
    </Formik>
  </>
}


type ArchiveTournamentProps = {
  tournamentData: TournamentData,
  setTournamentData: (tournamentData: TournamentData) => void,
  apiKey: ApiKey,
};

function ArchiveTournament(props: ArchiveTournamentProps) {

  type ArchiveTournamentValue = {}

  const onSubmit = async (_: ArchiveTournamentValue,
    fprops: FormikHelpers<ArchiveTournamentValue>) => {

    const maybeTournamentData = await tournamentDataNew({
      tournamentId: props.tournamentData.tournament.tournamentId,
      apiKey: props.apiKey.key,
      title: props.tournamentData.title,
      description: props.tournamentData.description,
      active: !props.tournamentData.active,
    });

    if (isErr(maybeTournamentData)) {
      switch (maybeTournamentData.Err) {
        case "UNAUTHORIZED": {
          fprops.setStatus({
            failureResult: "You are not authorized to archive this tournament.",
            successResult: ""
          });
          break;
        }
        default: {
          fprops.setStatus({
            failureResult: "An unknown or network error has occured while managing tournament.",
            successResult: ""
          });
          break;
        }
      }
      return;
    }

    fprops.setStatus({
      failureResult: "",
      successResult: "Tournament Edited"
    });

    // execute callback
    props.setTournamentData(maybeTournamentData.Ok);
  }

  return <>
    <Formik<ArchiveTournamentValue>
      onSubmit={onSubmit}
      initialValues={{}}
      initialStatus={{
        failureResult: "",
        successResult: ""
      }}
    >
      {(fprops) => <>
        <Form
          noValidate
          onSubmit={fprops.handleSubmit} >
          <div hidden={fprops.status.successResult !== ""}>
            <p>
              Are you sure you want to {props.tournamentData.active ? "archive" : "unarchive"} {props.tournamentData.title}?
            </p>
            <Button type="submit">Confirm</Button>
            <br />
            <Form.Text className="text-danger">{fprops.status.failureResult}</Form.Text>
          </div>
          <Form.Text className="text-success">{fprops.status.successResult}</Form.Text>
        </Form>
      </>}
    </Formik>
  </>
}

const ManageTournamentData = (props: {
  tournamentData: TournamentData,
  setTournamentData: (tournamentData: TournamentData) => void,
  apiKey: ApiKey,
}) => {

  const [showEditTournamentData, setShowEditTournamentData] = React.useState(false);
  const [showArchiveTournamentData, setShowArchiveTournamentData] = React.useState(false);

  return <>
    <Table hover bordered>
      <tbody>
        <tr>
          <th>Status</th>
          <td>{props.tournamentData.active ? "Active" : "Archived"}</td>
        </tr>
        <tr>
          <th>Title</th>
          <td>{props.tournamentData.title}</td>
        </tr>
        <tr>
          <th>Description</th>
          <td>{props.tournamentData.description}</td>
        </tr>
        <tr>
          <th>Creator</th>
          <td><ViewUser userId={props.tournamentData.tournament.creatorUserId} apiKey={props.apiKey} expanded={false} /></td>
        </tr>
        <tr>
          <th>Creation Time</th>
          <td>{format(props.tournamentData.tournament.creationTime, "MMM do")} </td>
        </tr>
      </tbody>
    </Table>
    <Action
      title="Edit"
      icon={EditIcon}
      onClick={() => setShowEditTournamentData(true)}
    />
    {props.tournamentData.active
      ? <Action
        title="Delete"
        icon={DeleteIcon}
        variant="danger"
        onClick={() => setShowArchiveTournamentData(true)}
      />
      : <Action
        title="Restore"
        icon={RestoreIcon}
        variant="danger"
        onClick={() => setShowArchiveTournamentData(true)}
      />
    }

    <DisplayModal
      title="Edit Tournament"
      show={showEditTournamentData}
      onClose={() => setShowEditTournamentData(false)}
    >
      <EditTournamentData
        apiKey={props.apiKey}
        tournamentData={props.tournamentData}
        setTournamentData={(tournamentData) => {
          setShowEditTournamentData(false);
          props.setTournamentData(tournamentData);
        }}
      />
    </DisplayModal>

    <DisplayModal
      title="Archive Tournament"
      show={showArchiveTournamentData}
      onClose={() => setShowArchiveTournamentData(false)}
    >
      <ArchiveTournament
        apiKey={props.apiKey}
        tournamentData={props.tournamentData}
        setTournamentData={(tournamentData) => {
          setShowArchiveTournamentData(false);
          props.setTournamentData(tournamentData);
        }}
      />
    </DisplayModal>
  </>
}

export default ManageTournamentData;
