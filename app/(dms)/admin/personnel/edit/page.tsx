'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { EditPersonnelContent } from './content';

export default function EditPersonnelPage() {
  return (
    <Fragment>
      <Container>
        <EditPersonnelContent />
      </Container>
    </Fragment>
  );
}
