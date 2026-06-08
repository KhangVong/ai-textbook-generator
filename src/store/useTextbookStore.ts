import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface OutlineNode {
  id: string;
  title: string;
  level: number;
  content?: string;
  children: OutlineNode[];
}

export type AppStatus = 'IDLE' | 'GENERATING_OUTLINE' | 'EDITING_OUTLINE' | 'GENERATING_CHAPTERS' | 'COMPLETE';

export interface BookMetadata {
  targetAudience?: string;
  tone?: string;
  prerequisites?: string;
}

interface TextbookState {
  title: string;
  outline: OutlineNode[];
  metadata: BookMetadata;
  apiKey: string | null;
  baseURL: string;
  modelName: string;
  enableQuizzes: boolean;
  googleApiKey: string;
  googleCx: string;
  status: AppStatus;
  
  // UI States
  currentView: 'READ' | 'MINDMAP';
  isEditMode: boolean;
  selectedNodeId: string | null;
  activeProjectId: string | null;
  isSettingsOpen: boolean;

  // Actions
  setTitle: (title: string) => void;
  setMetadata: (metadata: BookMetadata) => void;
  setApiKey: (key: string | null) => void;
  setBaseURL: (url: string) => void;
  setModelName: (model: string) => void;
  setEnableQuizzes: (enable: boolean) => void;
  setGoogleApiKey: (key: string) => void;
  setGoogleCx: (cx: string) => void;
  setOutline: (outline: OutlineNode[]) => void;
  setStatus: (status: AppStatus) => void;
  updateNodeContent: (id: string, content: string) => void;
  updateNodeTitle: (id: string, title: string) => void;
  addNode: (parentId: string | null, node: OutlineNode) => void;
  deleteNode: (id: string) => void;
  
  setCurrentView: (view: 'READ' | 'MINDMAP') => void;
  setIsEditMode: (isEdit: boolean) => void;
  setSelectedNodeId: (id: string | null) => void;
  setIsSettingsOpen: (open: boolean) => void;
  clearStore: () => void;
}

// Helper to recursively find and update a node
const updateNodeRecursive = (nodes: OutlineNode[], id: string, updater: (node: OutlineNode) => OutlineNode): OutlineNode[] => {
  return nodes.map(node => {
    if (node.id === id) {
      return updater(node);
    }
    if (node.children.length > 0) {
      return {
        ...node,
        children: updateNodeRecursive(node.children, id, updater)
      };
    }
    return node;
  });
};

const deleteNodeRecursive = (nodes: OutlineNode[], id: string): OutlineNode[] => {
  return nodes.filter(node => node.id !== id).map(node => ({
    ...node,
    children: deleteNodeRecursive(node.children, id)
  }));
};

const addNodeRecursive = (nodes: OutlineNode[], parentId: string, newNode: OutlineNode): OutlineNode[] => {
  return nodes.map(node => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...node.children, newNode]
      };
    }
    if (node.children.length > 0) {
      return {
        ...node,
        children: addNodeRecursive(node.children, parentId, newNode)
      };
    }
    return node;
  });
};

export const useTextbookStore = create<TextbookState>()(
  persist(
    (set) => ({
      title: 'Untitled Textbook',
      outline: [],
      metadata: {},
      apiKey: null,
      baseURL: 'https://api.openai.com/v1',
      modelName: 'gpt-4o',
      googleApiKey: '',
      googleCx: '',
      status: 'IDLE',
      currentView: 'READ',
      isEditMode: false,
      selectedNodeId: null,
      activeProjectId: null,
      isSettingsOpen: false,
      // Settings states
      enableQuizzes: true,

      setTitle: (title) => set({ title }),
      setMetadata: (metadata) => set({ metadata }),
      setApiKey: (key) => set({ apiKey: key }),
      setBaseURL: (url) => set({ baseURL: url }),
      setModelName: (model) => set({ modelName: model }),
      setEnableQuizzes: (enable) => set({ enableQuizzes: enable }),
      setGoogleApiKey: (key) => set({ googleApiKey: key }),
      setGoogleCx: (cx) => set({ googleCx: cx }),
      setOutline: (outline) => set({ outline }),
      setStatus: (status) => set({ status }),
      setCurrentView: (view) => set({ currentView: view }),
      setIsEditMode: (isEdit) => set({ isEditMode: isEdit }),
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
      clearStore: () => set({
        title: 'Untitled Textbook',
        outline: [],
        metadata: {},
        status: 'IDLE',
        activeProjectId: null,
      }),

      updateNodeContent: (id, content) => set((state) => ({
        outline: updateNodeRecursive(state.outline, id, (node) => ({ ...node, content }))
      })),

      updateNodeTitle: (id, title) => set((state) => ({
        outline: updateNodeRecursive(state.outline, id, (node) => ({ ...node, title }))
      })),

      addNode: (parentId, newNode) => set((state) => {
        if (!parentId) {
          return { outline: [...state.outline, newNode] };
        }
        return {
          outline: addNodeRecursive(state.outline, parentId, newNode)
        };
      }),

      deleteNode: (id) => set((state) => ({
        outline: deleteNodeRecursive(state.outline, id)
      })),
    }),
    {
      name: 'anyknowledge-settings',
      partialize: (state) => ({
        apiKey: state.apiKey,
        baseURL: state.baseURL,
        modelName: state.modelName,
        enableQuizzes: state.enableQuizzes,
        googleApiKey: state.googleApiKey,
        googleCx: state.googleCx,
        currentView: state.currentView,
      }),
    }
  )
);
