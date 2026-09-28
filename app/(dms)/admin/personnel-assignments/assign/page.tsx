'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { AssignPersonnelContent } from './content';

export default function AssignPersonnelPage() {
  return (
    <Fragment>
      <Container>
        <AssignPersonnelContent />
      </Container>
    </Fragment>
  );
}
