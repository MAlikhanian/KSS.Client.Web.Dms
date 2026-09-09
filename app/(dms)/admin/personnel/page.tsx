'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PersonnelContent } from './content';

export default function PersonnelPage() {
  return (
    <Fragment>
      <Container>
        <PersonnelContent />
      </Container>
    </Fragment>
  );
}
