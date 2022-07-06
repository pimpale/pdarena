import React from 'react'
import { Async, AsyncProps } from 'react-async';
import { Table } from 'react-bootstrap';
import { Eye } from 'react-bootstrap-icons';
import { Loader, Link } from '@innexgo/common-react-components';
import format from 'date-fns/format';
import { ApiKey, UserData, userDataView } from '@innexgo/frontend-auth-api';
import { isErr, unwrap } from '@innexgo/frontend-common';


const ToggleExpandButton = (props: { expanded: boolean, setExpanded: (b: boolean) => void }) =>
  <button className="btn btn-link px-0 py-0 float-end"
    style={{
      fontWeight: "normal" as const,
      fontSize: "0.875rem"
    }}
    onClick={_ => props.setExpanded(!props.expanded)}>
    {props.expanded ? "Less" : "More"}
  </button>

const loadUserData = async (props: AsyncProps<UserData>) => {
  const maybeUser = await userDataView({
    creatorUserId: [props.userId],
    onlyRecent: true,
    apiKey: props.apiKey.key,
  })
    .then(unwrap);
  return maybeUser[0];
}


export const ViewUser = (props: {
  userId: number,
  apiKey: ApiKey,
  expanded: boolean
}) => {
  const [expanded, setExpanded] = React.useState(props.expanded);
  return <Async promiseFn={loadUserData} apiKey={props.apiKey} userId={props.userId}>
    <Async.Pending><Loader /></Async.Pending>
    <Async.Rejected>
      <span className="text-danger">Unable to load user data.</span>
    </Async.Rejected>
    <Async.Fulfilled<UserData>>{user =>
      !expanded
        ? <span className="clearfix">
          {user.realname}
          <ToggleExpandButton expanded={expanded} setExpanded={setExpanded} />
        </span>
        : <div>
          <Table hover bordered>
            <tbody>
              <tr>
                <th>Name</th>
                <td>{user.realname}</td>
              </tr>
              <tr>
                <th>Username</th>
                <td>{user.username}</td>
              </tr>
              <tr>
                <th>Actions</th>
                <td>
                  <Link
                    title="View"
                    icon={Eye}
                    href={`/instructor_manage_course?courseId=${user.creatorUserId}`}
                    variant="dark"
                  />
                </td>
              </tr>
            </tbody>
          </Table>
          <ToggleExpandButton expanded={expanded} setExpanded={setExpanded} />
        </div>
    }</Async.Fulfilled>
  </Async>
}

