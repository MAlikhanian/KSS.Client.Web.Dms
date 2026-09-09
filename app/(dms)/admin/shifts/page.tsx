'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { ShiftsContent } from './content';

export default function ShiftsPage() {
  return (
    <Fragment>
      <Container>
        <ShiftsContent />
      </Container>
    </Fragment>
  );
}
