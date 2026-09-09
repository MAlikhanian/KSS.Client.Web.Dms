'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { ProjectRolesContent } from './content';

export default function ProjectRolesPage() {
  return (
    <Fragment>
      <Container>
        <ProjectRolesContent />
      </Container>
    </Fragment>
  );
}
