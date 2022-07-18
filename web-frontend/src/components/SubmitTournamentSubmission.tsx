import { ApiKey } from "@innexgo/frontend-auth-api";
import { Formik, FormikHelpers } from "formik";
import { TournamentSubmission, tournamentSubmissionNew } from "../utils/api";
import {isErr, unwrap} from '@innexgo/frontend-common';
import { Button, Form } from "react-bootstrap";

type SubmitSubmissionProps = {
  tournamentSubmission: TournamentSubmission,
  setTournamentSubmission: (tournamentSubmission: TournamentSubmission) => void,
  apiKey: ApiKey,
};

function SubmitSubmission(props: SubmitSubmissionProps) {

  type SubmitSubmissionValue = {}

  const onSubmit = async (_: SubmitSubmissionValue,
    fprops: FormikHelpers<SubmitSubmissionValue>) => {

    const maybeTournamentSubmission = await tournamentSubmissionNew({
      tournamentId: props.tournamentSubmission.tournament.tournamentId,
      submissionId: props.tournamentSubmission.submissionId,
      name: props.tournamentSubmission.name,
      kind: "COMPETE",
      apiKey: props.apiKey.key,
    });

    if (isErr(maybeTournamentSubmission)) {
      switch (maybeTournamentSubmission.Err) {
        case "UNAUTHORIZED": {
          fprops.setStatus({
            failureResult: "You are not authorized to manage this submission.",
            successResult: ""
          });
          break;
        }
        case "TOURNAMENT_ARCHIVED": {
          fprops.setStatus({
            failureResult: "This tournament has been archived.",
            successResult: ""
          });
          break;
        }
        case "TOURNAMENT_SUBMISSION_NOT_VALIDATED": {
          fprops.setStatus({
            failureResult: "This submission is not in state VALIDATE.",
            successResult: ""
          });
          break;
        }
        case "TOURNAMENT_SUBMISSION_TESTCASE_INCOMPLETE": {
          fprops.setStatus({
            failureResult: "Not all testcases have finished executing.",
            successResult: ""
          });
          break;
        }
        case "TOURNAMENT_SUBMISSION_TESTCASE_FAILS": {
          fprops.setStatus({
            failureResult: "At least one testcase has failed. All testcases must pass before it can be submitted.",
            successResult: ""
          });
          break;
        }
        default: {
          fprops.setStatus({
            failureResult: "An unknown or network error has occured while managing submission.",
            successResult: ""
          });
          break;
        }
      }
      return;
    }

    fprops.setStatus({
      failureResult: "",
      successResult: "Submission Edited"
    });

    // execute callback
    props.setTournamentSubmission(maybeTournamentSubmission.Ok);
  }

  return <>
    <Formik<SubmitSubmissionValue>
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
              Are you sure you want to submit {props.tournamentSubmission.name}?
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

export default SubmitSubmission;
