'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { ApprovalsContent } from './content';

export default function ApprovalsPage() {
  return (
    <Fragment>
      <Container>
        <ApprovalsContent />
      </Container>
    </Fragment>
  );
}
