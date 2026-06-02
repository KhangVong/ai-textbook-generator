"use client";

import { useEffect, useRef } from 'react';
import { useTextbookStore } from '@/store/useTextbookStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReadView } from '@/components/views/ReadView';
import { MindmapView } from '@/components/views/MindmapView';

export const WorkspaceClient = ({ project }: { project: any }) => {
  const { setOutline, setTitle, currentView } = useTextbookStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      setOutline(project.outline_data);
      setTitle(project.title);
      useTextbookStore.setState({ status: 'EDITING_OUTLINE' });
      isInitialized.current = true;
    }
  }, [project, setOutline, setTitle]);

  // Optionally, we can save the project.id to the store so useGenerationEngine knows which project to update in Supabase.
  useEffect(() => {
    useTextbookStore.setState({ activeProjectId: project.id });
  }, [project.id]);

  return (
    <AppLayout>
      <div className="flex-1 flex w-full h-full overflow-hidden">
        {currentView === 'MINDMAP' ? <MindmapView /> : <ReadView />}
      </div>
    </AppLayout>
  );
};
