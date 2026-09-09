'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { VesselsContent } from './content';

export default function VesselsPage() {
  return (
    <Fragment>
      <Container>
        <VesselsContent />
      </Container>
    </Fragment>
  );
}
