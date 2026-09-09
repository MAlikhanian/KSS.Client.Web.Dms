'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { CreateVesselContent } from './content';

export default function CreateVesselPage() {
  return (
    <Fragment>
      <Container>
        <CreateVesselContent />
      </Container>
    </Fragment>
  );
}
