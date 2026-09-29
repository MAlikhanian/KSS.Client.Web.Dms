'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { EditMonthlyVolumeCorrectionContent } from './content';

export default function EditMonthlyVolumeCorrectionPage() {
  return (
    <Fragment>
      <Container>
        <EditMonthlyVolumeCorrectionContent />
      </Container>
    </Fragment>
  );
}
