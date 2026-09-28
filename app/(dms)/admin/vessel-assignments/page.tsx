'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { VesselAssignmentsContent } from './content';

export default function VesselAssignmentsPage() {
  return (
    <Fragment>
      <Container>
        <VesselAssignmentsContent />
      </Container>
    </Fragment>
  );
}
