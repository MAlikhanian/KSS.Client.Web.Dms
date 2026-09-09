'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { EditVesselContent } from './content';

export default function EditVesselPage() {
  return (
    <Fragment>
      <Container>
        <EditVesselContent />
      </Container>
    </Fragment>
  );
}
