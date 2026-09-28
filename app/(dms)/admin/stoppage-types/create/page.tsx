'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { CreateStoppageTypeContent } from './content';

export default function CreateStoppageTypePage() {
  return (
    <Fragment>
      <Container>
        <CreateStoppageTypeContent />
      </Container>
    </Fragment>
  );
}
