'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { DashboardContent } from './content';

export default function DashboardPage() {
  return (
    <Fragment>
      <Container>
        <DashboardContent />
      </Container>
    </Fragment>
  );
}
