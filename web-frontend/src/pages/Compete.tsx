import React from 'react';
import { Card, Row, Container, Col, } from 'react-bootstrap';
import { Async, AsyncProps } from 'react-async';
import update from 'immutability-helper';
import { Section, Loader, AddButton, DisplayModal, } from '@innexgo/common-react-components';
import ErrorMessage from '../components/ErrorMessage';
import ExternalLayout from '../components/ExternalLayout';
import { unwrap } from '@innexgo/frontend-common';
import AuthenticatedComponentProps from '@innexgo/auth-react-components/lib/components/AuthenticatedComponentProps';

import { DefaultSidebarLayout } from '@innexgo/auth-react-components';
import DashboardLayout from '../components/DashboardLayout';
import PythonEditor from '../components/PythonEditor';

function Compete(props: AuthenticatedComponentProps) {
  const [code, setCode] = React.useState("# Python code Goes here");

  return <DashboardLayout {...props}>
    <div style={{ position:'relative', height: "100vh" }}>
      <PythonEditor
        code={code}
        setCode={setCode}
      />
      <button style={{
        position: "absolute",
        bottom: "2rem",
        left: "2rem"
      }} className='btn btn-primary'>
        Submit
      </button>
    </div>
  </DashboardLayout >
}

export default Compete;
