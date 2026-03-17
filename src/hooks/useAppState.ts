import { useState, useCallback, useEffect } from 'react';
import { AppView, Project, Document, DocumentType } from '../types';
import { dbService } from '../services/db';

export function useAppState() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedProjects, loadedDocuments] = await Promise.all([
        dbService.getProjects(),
        dbService.getDocuments()]
        );
        setProjects(
          loadedProjects.sort(
            (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
        setDocuments(
          loadedDocuments.sort(
            (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
        );
      } catch (error) {
        console.error('Failed to load data from IndexedDB:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const navigate = useCallback(
    (view: AppView, projectId?: string, documentId?: string) => {
      setCurrentView(view);
      // Always update IDs: if not provided, clear them to avoid stale references
      setCurrentProjectId(projectId ?? null);
      setCurrentDocumentId(documentId ?? null);
    },
    []
  );

  const addProject = useCallback(
    async (project: Omit<Project, 'id' | 'createdAt' | 'status'>) => {
      const newProject: Project = {
        ...project,
        id: `p${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: '草稿'
      };
      await dbService.saveProject(newProject);
      setProjects((prev) => [newProject, ...prev]);
      return newProject;
    },
    []
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>) => {
      setProjects((prev) => {
        const newProjects = prev.map((p) =>
        p.id === id ? { ...p, ...updates } : p
        );
        const updatedProject = newProjects.find((p) => p.id === id);
        if (updatedProject) {
          dbService.saveProject(updatedProject).catch(console.error);
        }
        return newProjects;
      });
    },
    []
  );

  const deleteProject = useCallback(async (id: string) => {
    await dbService.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setDocuments((prev) => prev.filter((d) => d.projectId !== id));
  }, []);

  const addDocument = useCallback(
    async (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newDoc: Document = {
        ...doc,
        id: `d${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await dbService.saveDocument(newDoc);
      setDocuments((prev) => [newDoc, ...prev]);
      return newDoc;
    },
    []
  );

  const updateDocument = useCallback(
    async (id: string, updates: Partial<Document>) => {
      setDocuments((prev) => {
        const newDocs = prev.map((d) =>
        d.id === id ?
        { ...d, ...updates, updatedAt: new Date().toISOString() } :
        d
        );
        const updatedDoc = newDocs.find((d) => d.id === id);
        if (updatedDoc) {
          dbService.saveDocument(updatedDoc).catch(console.error);
        }
        return newDocs;
      });
    },
    []
  );

  return {
    isLoading,
    currentView,
    projects,
    documents,
    currentProject: projects.find((p) => p.id === currentProjectId) || null,
    currentDocument: documents.find((d) => d.id === currentDocumentId) || null,
    navigate,
    addProject,
    updateProject,
    deleteProject,
    addDocument,
    updateDocument
  };
}