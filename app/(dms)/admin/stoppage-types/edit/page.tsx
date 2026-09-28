'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { EditStoppageTypeContent } from './content';

export default function EditStoppageTypePage() {
  return (
    <Fragment>
      <Container>
        <EditStoppageTypeContent />
      </Container>
    </Fragment>
  );
}
