'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { CreateMonthlyVolumeCorrectionContent } from './content';

export default function CreateMonthlyVolumeCorrectionPage() {
  return (
    <Fragment>
      <Container>
        <CreateMonthlyVolumeCorrectionContent />
      </Container>
    </Fragment>
  );
}
