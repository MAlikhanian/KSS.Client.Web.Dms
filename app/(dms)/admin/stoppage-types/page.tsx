'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { StoppageTypesContent } from './content';

export default function StoppageTypesPage() {
  return (
    <Fragment>
      <Container>
        <StoppageTypesContent />
      </Container>
    </Fragment>
  );
}
