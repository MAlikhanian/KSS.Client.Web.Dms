'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { EditProjectContent } from './content';

export default function EditProjectPage() {
  return (
    <Fragment>
      <Container>
        <EditProjectContent />
      </Container>
    </Fragment>
  );
}
