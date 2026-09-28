'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { EditPersonnelAssignmentContent } from './content';

export default function EditPersonnelAssignmentPage() {
  return (
    <Fragment>
      <Container>
        <EditPersonnelAssignmentContent />
      </Container>
    </Fragment>
  );
}
