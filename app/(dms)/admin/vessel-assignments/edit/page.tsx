'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { EditVesselAssignmentContent } from './content';

export default function EditVesselAssignmentPage() {
  return (
    <Fragment>
      <Container>
        <EditVesselAssignmentContent />
      </Container>
    </Fragment>
  );
}
