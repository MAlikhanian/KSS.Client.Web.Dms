'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PersonnelAssignmentsContent } from './content';

export default function PersonnelAssignmentsPage() {
  return (
    <Fragment>
      <Container>
        <PersonnelAssignmentsContent />
      </Container>
    </Fragment>
  );
}
