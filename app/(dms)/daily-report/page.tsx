'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { DailyReportContent } from './content';

export default function DailyReportPage() {
  return (
    <Fragment>
      <Container>
        <DailyReportContent />
      </Container>
    </Fragment>
  );
}
