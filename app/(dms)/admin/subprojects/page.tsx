'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { SubprojectsContent } from './content';

export default function SubprojectsPage() {
  return (
    <Fragment>
      <Container>
        <SubprojectsContent />
      </Container>
    </Fragment>
  );
}
