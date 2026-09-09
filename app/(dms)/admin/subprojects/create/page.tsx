'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { CreateSubprojectContent } from './content';

export default function CreateSubprojectPage() {
  return (
    <Fragment>
      <Container>
        <CreateSubprojectContent />
      </Container>
    </Fragment>
  );
}
