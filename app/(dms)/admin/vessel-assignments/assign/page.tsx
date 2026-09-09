'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { AssignVesselContent } from './content';

export default function AssignVesselPage() {
  return (
    <Fragment>
      <Container>
        <AssignVesselContent />
      </Container>
    </Fragment>
  );
}
