import { ApiKey } from "@innexgo/frontend-auth-api";
import { Formik, FormikHelpers } from "formik";
import { TournamentSubmission, tournamentSubmissionNew } from "../utils/api";
import {isErr, unwrap} from '@innexgo/frontend-common';
import { Button, Form } from "react-bootstrap";

type ArchiveSubmissionProps = {
  tournamentSubmission: TournamentSubmission,
  setTournamentSubmission: (tournamentSubmission: TournamentSubmission) => void,
  apiKey: ApiKey,
};

function ArchiveSubmission(props: ArchiveSubmissionProps) {

  type ArchiveSubmissionValue = {}

  const onSubmit = async (_: ArchiveSubmissionValue,
    fprops: FormikHelpers<ArchiveSubmissionValue>) => {

    const maybeTournamentSubmission = await tournamentSubmissionNew({
      tournamentId: props.tournamentSubmission.tournament.tournamentId,
      submissionId: props.tournamentSubmission.submissionId,
      name: props.tournamentSubmission.name,
      kind: "CANCEL",
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
    <Formik<ArchiveSubmissionValue>
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
              Are you sure you want to archive {props.tournamentSubmission.name}?
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

export default ArchiveSubmission;
