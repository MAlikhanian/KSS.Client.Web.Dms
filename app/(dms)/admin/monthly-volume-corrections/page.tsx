'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { MonthlyVolumeCorrectionsContent } from './content';

export default function MonthlyVolumeCorrectionsPage() {
  return (
    <Fragment>
      <Container>
        <MonthlyVolumeCorrectionsContent />
      </Container>
    </Fragment>
  );
}
