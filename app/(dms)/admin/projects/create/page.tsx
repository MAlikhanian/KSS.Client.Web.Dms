'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { CreateProjectContent } from './content';

export default function CreateProjectPage() {
  return (
    <Fragment>
      <Container>
        <CreateProjectContent />
      </Container>
    </Fragment>
  );
}
