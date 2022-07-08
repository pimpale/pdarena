import React from 'react';
import { Card, Row, Container, Col } from 'react-bootstrap';
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

function Dashboard(props: AuthenticatedComponentProps) {
  return <DashboardLayout {...props}>
    <div style={{ width: "100%", height: "100vh" }}>
      <PythonEditor
        initialCode='# Python Code goes here'
      />
    </div>
  </DashboardLayout>
}

export default Dashboard;
