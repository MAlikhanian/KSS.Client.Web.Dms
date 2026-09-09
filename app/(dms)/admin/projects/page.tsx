'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { ProjectsContent } from './content';

export default function ProjectsPage() {
  return (
    <Fragment>
      <Container>
        <ProjectsContent />
      </Container>
    </Fragment>
  );
}
