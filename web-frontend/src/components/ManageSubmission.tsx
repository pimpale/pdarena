import React from 'react';
import { Form, Button, Table } from 'react-bootstrap';
import { Loader, Action, DisplayModal } from '@innexgo/common-react-components';
import { Async, AsyncProps } from 'react-async';
import { Submission, } from '../utils/api';
import { ViewUser } from '../components/ViewData';
import { Pencil as EditIcon, X as DeleteIcon, BoxArrowUp as RestoreIcon } from 'react-bootstrap-icons';
import { Formik, FormikHelpers } from 'formik'
import format from 'date-fns/format';

import { isErr, unwrap } from '@innexgo/frontend-common';
import { User, ApiKey } from '@innexgo/frontend-auth-api';


const ManageSubmission = (props: {
  submission: Submission,
  apiKey: ApiKey,
}) => {
  return <>
    <Table hover bordered>
      <tbody>
        <tr>
          <th>Code</th>
          <td>{props.submission.code}</td>
        </tr>
        <tr>
          <th>Creator</th>
          <td><ViewUser userId={props.submission.creatorUserId} apiKey={props.apiKey} expanded={false} /></td>
        </tr>
        <tr>
          <th>Creation Time</th>
          <td>{format(props.submission.creationTime, "MMM do, p")} </td>
        </tr>
      </tbody>
    </Table>
  </>
}

export default ManageSubmission;
