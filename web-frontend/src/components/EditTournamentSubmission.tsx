import { ApiKey } from "@innexgo/frontend-auth-api";
import { Formik, FormikHelpers } from "formik";
import { Button, Form } from "react-bootstrap";
import { TournamentSubmission, tournamentSubmissionNew } from "../utils/api";

import { isErr, unwrap } from '@innexgo/frontend-common';

type EditTournamentSubmissionProps = {
  tournamentSubmission: TournamentSubmission,
  setTournamentSubmission: (tournamentSubmission: TournamentSubmission) => void,
  apiKey: ApiKey,
};

function EditTournamentSubmission(props: EditTournamentSubmissionProps) {

  type EditTournamentSubmissionValue = {
    name: string,
  }

  const onSubmit = async (values: EditTournamentSubmissionValue,
    fprops: FormikHelpers<EditTournamentSubmissionValue>) => {

    const maybeTournamentSubmission = await tournamentSubmissionNew({
      tournamentId: props.tournamentSubmission.tournament.tournamentId,
      submissionId: props.tournamentSubmission.submissionId,
      apiKey: props.apiKey.key,
      name: values.name,
      kind: props.tournamentSubmission.kind,
    });

    if (isErr(maybeTournamentSubmission)) {
      switch (maybeTournamentSubmission.Err) {
        case "UNAUTHORIZED": {
          fprops.setStatus({
            failureResult: "You are not authorized to edit this tournament submission.",
            successResult: ""
          });
          break;
        }
        default: {
          fprops.setStatus({
            failureResult: "An unknown or network error has occured while modifying submission data.",
            successResult: ""
          });
          break;
        }
      }
      return;
    }

    fprops.setStatus({
      failureResult: "",
      successResult: "Submission Successfully Modified"
    });

    // execute callback
    props.setTournamentSubmission(maybeTournamentSubmission.Ok);
  }

  return <>
    <Formik<EditTournamentSubmissionValue>
      onSubmit={onSubmit}
      initialValues={{
        name: props.tournamentSubmission.name,
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
              <Form.Label>Submission Name</Form.Label>
              <Form.Control
                name="name"
                type="text"
                placeholder="Submission Name"
                as="input"
                value={fprops.values.name}
                onChange={e => fprops.setFieldValue("name", e.target.value)}
                isInvalid={!!fprops.errors.name}
              />
              <Form.Control.Feedback type="invalid">{fprops.errors.name}</Form.Control.Feedback>
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

