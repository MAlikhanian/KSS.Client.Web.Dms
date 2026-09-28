'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { CreatePersonnelContent } from './content';

export default function CreatePersonnelPage() {
  return (
    <Fragment>
      <Container>
        <CreatePersonnelContent />
      </Container>
    </Fragment>
  );
}
