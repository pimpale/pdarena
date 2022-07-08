import { ApiKey } from "@innexgo/frontend-auth-api"
import { Formik, FormikErrors, FormikHelpers } from "formik"
import { Button, Form } from "react-bootstrap"
import { TournamentData, TournamentSubmission, submissionNew, tournamentSubmissionNew} from "../utils/api"
import { isErr, unwrap } from '@innexgo/frontend-common';

type CreateVerifySubmissionProps = {
  code: string,
  tournamentData: TournamentData,
  apiKey: ApiKey,
  postSubmit: (ts: TournamentSubmission) => void
}



function CreateVerifySubmission(props: CreateVerifySubmissionProps) {

  type CreateSubmissionValue = {
    name: string,
  }

  const onSubmit = async (values: CreateSubmissionValue,
    fprops: FormikHelpers<CreateSubmissionValue>) => {

    let errors: FormikErrors<CreateSubmissionValue> = {};

    // Validate input
    let hasError = false;

    if (values.name === "") {
      errors.name = "Please enter a submission name.";
      hasError = true;
    }

    fprops.setErrors(errors);
    if (hasError) {
      return;
    }

    const maybeSubmission = await submissionNew({
      code: props.code,
      apiKey: props.apiKey.key,
    });


    if (isErr(maybeSubmission)) {
      switch (maybeSubmission.Err) {
        case "UNAUTHORIZED": {
          fprops.setStatus({
            failureResult: "You are not authorized to create this submission.",
            successResult: ""
          });
          break;
        }
        default: {
          fprops.setStatus({
            failureResult: "An unknown or network error has occured while trying to create submission.",
            successResult: ""
          });
          break;
        }
      }
      return;
    }

    
    const maybeTournamentSubmission = await tournamentSubmissionNew({
      tournamentId: props.tournamentData.tournament.tournamentId,
      submissionId: maybeSubmission.Ok.submissionId,
      name: values.name,
      kind: "VALIDATE",
      apiKey: props.apiKey.key,
    });


    if (isErr(maybeTournamentSubmission)) {
      switch (maybeTournamentSubmission.Err) {
        case "TOURNAMENT_ARCHIVED": {
          fprops.setStatus({
            failureResult: "This tournament has been archived",
            successResult: ""
          });
          break;
        }
        default: {
          fprops.setStatus({
            failureResult: "An unknown or network error has occured while trying to create submission.",
            successResult: ""
          });
          break;
        }
      }
      return;
    }

    fprops.setStatus({
      failureResult: "",
      successResult: "Submission Created"
    });
    // execute callback
    props.postSubmit(maybeTournamentSubmission.Ok);
  }

  return <>
    <Formik<CreateSubmissionValue>
      onSubmit={onSubmit}
      initialValues={{
        name: "",
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

export default CreateVerifySubmission;
