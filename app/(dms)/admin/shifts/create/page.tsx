'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { CreateShiftContent } from './content';

export default function CreateShiftPage() {
  return (
    <Fragment>
      <Container>
        <CreateShiftContent />
      </Container>
    </Fragment>
  );
}
