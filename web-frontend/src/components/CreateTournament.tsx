import React from "react"
import { Formik, FormikHelpers, FormikErrors } from 'formik'
import { Button, Form } from "react-bootstrap";
import { TournamentData, tournamentNew } from "../utils/api";
import { isErr } from '@innexgo/frontend-common';
import { ApiKey } from '@innexgo/frontend-auth-api';
import { AuthenticatedComponentProps } from '@innexgo/auth-react-components';


type CreateTournamentProps = {
  apiKey: ApiKey;
  postSubmit: (t:TournamentData) => void;
}

function CreateTournament(props: CreateTournamentProps) {

  type CreateTournamentValue = {
    title: string,
    description: string,
  }

  const onSubmit = async (values: CreateTournamentValue,
    fprops: FormikHelpers<CreateTournamentValue>) => {

    let errors: FormikErrors<CreateTournamentValue> = {};

    // Validate input

    let hasError = false;
    if (values.title === "") {
      errors.title = "Please enter your tourtitlent title";
      hasError = true;
    }
    if (values.description === "") {
      errors.description = "Please enter a description";
      hasError = true;
    }

    fprops.setErrors(errors);
    if (hasError) {
      return;
    }

    const maybeTournament = await tournamentNew({
      title: values.title,
      description: values.description,
      nMatchups: 30,
      nRounds: 30,
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
