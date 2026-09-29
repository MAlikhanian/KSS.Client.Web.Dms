'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { ReportsContent } from './content';

export default function ReportsPage() {
  return (
    <Fragment>
      <Container>
        <ReportsContent />
      </Container>
    </Fragment>
  );
}
