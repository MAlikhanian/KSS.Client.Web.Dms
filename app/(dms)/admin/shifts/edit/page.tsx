'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { EditShiftContent } from './content';

export default function EditShiftPage() {
  return (
    <Fragment>
      <Container>
        <EditShiftContent />
      </Container>
    </Fragment>
  );
}
