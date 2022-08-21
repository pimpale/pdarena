import React from "react"
import { Formik, FormikHelpers, FormikErrors } from 'formik'
import { Button, Form } from "react-bootstrap";
import { TournamentData, tournamentNew } from "../utils/api";
import { isErr } from '@innexgo/frontend-common';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { AuthenticatedComponentProps } from '@innexgo/auth-react-components';


type CreateTournamentProps = {
  apiKey: ApiKey;
  postSubmit: (t: TournamentData) => void;
}

function CreateTournament(props: CreateTournamentProps) {

  type CreateTournamentValue = {
    title: string,
    description: string,
    nRounds: string,
    nMatchups: string,
  }

  const onSubmit = async (values: CreateTournamentValue,
    fprops: FormikHelpers<CreateTournamentValue>) => {

    let errors: FormikErrors<CreateTournamentValue> = {};

    // Validate input

    let hasError = false;
    if (values.title === "") {
      errors.title = "Please enter your tournament title";
      hasError = true;
    }
    if (values.description === "") {
      errors.description = "Please enter a description";
      hasError = true;
    }

    const nRounds = parseInt(values.nRounds);
    if (isNaN(nRounds) || nRounds <= 0) {
      errors.nRounds = "Please enter a valid integer greater than 0";
      hasError = true;
    }

    const nMatchups = parseInt(values.nMatchups);
    if (isNaN(nMatchups) || nMatchups <= 0) {
      errors.nMatchups = "Please enter a valid integer greater than 0";
      hasError = true;
    }


    fprops.setErrors(errors);
    if (hasError) {
      return;
    }

    const maybeTournament = await tournamentNew({
      title: values.title,
      description: values.description,
      nMatchups,
      nRounds,
      apiKey: props.apiKey.key,
    });

    if (isErr(maybeTournament)) {
      switch (maybeTournament.Err) {
        case "UNAUTHORIZED": {
          fprops.setStatus({
            failureResult: "Not authorized to create tournament",
            successResult: ""
          });
          break;
        }
        case "TOURNAMENT_DATA_N_MATCHUPS_INVALID": {
          fprops.setStatus({
            failureResult: "The number of matchups is invalid",
            successResult: ""
          });
          break;
        }
        case "TOURNAMENT_DATA_N_ROUNDS_INVALID": {
          fprops.setStatus({
            failureResult: "The number of rounds is invalid",
            successResult: ""
          });
          break;
        }
        case "TOURNAMENT_DATA_TOO_MANY_MATCHES": {
          fprops.setStatus({
            failureResult: "Please reduce either the number of rounds or number of matchups.",
            successResult: ""
          });
          break;
        }
        default: {
          fprops.setStatus({
            failureResult: "An unknown or network error has occured while trying to create tournament.",
            successResult: ""
          });
          break;
        }
      }
      return;
    }

    fprops.setStatus({
      failureResult: "",
      successResult: "Tournament Created"
    });
    // execute callback
    props.postSubmit(maybeTournament.Ok);
  }

  return <>
    <Formik<CreateTournamentValue>
      onSubmit={onSubmit}
      initialValues={{
        title: "",
        description: "",
        nRounds: "" + 25,
        nMatchups: "" + 10,
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
                placeholder="Tournament Name"
                as="input"
                value={fprops.values.title}
                onChange={e => fprops.setFieldValue("title", e.target.value)}
                isInvalid={!!fprops.errors.title}
              />
              <Form.Control.Feedback type="invalid">{fprops.errors.title}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                name="description"
                type="text"
                placeholder="Description"
                as="input"
                value={fprops.values.description}
                onChange={e => fprops.setFieldValue("description", e.target.value)}
                isInvalid={!!fprops.errors.description}
              />
              <Form.Control.Feedback type="invalid">{fprops.errors.description}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label >Number of Matchups</Form.Label>
              <Form.Control
                name="nMatchups"
                type="number"
                placeholder="Number of Matchups"
                value={fprops.values.nMatchups}
                onChange={e => fprops.setFieldValue("nMatchups", e.target.value)}
                isInvalid={!!fprops.errors.nMatchups}
              />
              <Form.Control.Feedback type="invalid">{fprops.errors.nMatchups}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label >Number of Rounds per Matchup</Form.Label>
              <Form.Control
                name="nRounds"
                type="number"
                placeholder="Number of Rounds per Matchup"
                value={fprops.values.nRounds}
                onChange={e => fprops.setFieldValue("nRounds", e.target.value)}
                isInvalid={!!fprops.errors.nRounds}
              />
              <Form.Control.Feedback type="invalid">{fprops.errors.nRounds}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Button type="submit">Submit Form</Button>
            </Form.Group>
            <Form.Text className="text-danger">{fprops.status.failureResult}</Form.Text>
          </div>
          <Form.Text className="text-success">{fprops.status.successResult}</Form.Text>
        </Form>
      </>}
    </Formik>
  </>
}

export default CreateTournament;
