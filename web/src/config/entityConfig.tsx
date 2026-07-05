import type { ReactNode } from "react";
import {
  approveSuggestedCategory,
  createDirectoryEntry,
  getDirectoryEntry,
  getDirectoryEntryEditLink,
  listDirectoryEntries,
  listEntriesNeedingPhoto,
  updateDirectoryEntry,
  updateDirectoryEntryPublic,
} from "../api/directory";
import {
  approveSuggestedProjectCategory,
  createProject,
  getProject,
  getProjectEditLink,
  listProjects,
  listProjectsNeedingPhoto,
  updateProject,
  updateProjectPublic,
} from "../api/projects";
import type {
  DirectoryEntry,
  DirectoryEntryEditLink,
  DirectoryEntryInput,
  DirectoryEntryStatus,
  ProjectInput,
} from "../api/types";
import DirectoryEntryForm from "../components/DirectoryEntryForm";
import ProjectForm from "../components/ProjectForm";

export interface FormRenderProps {
  formKey?: string;
  initialValues?: Partial<ProjectInput>;
  onSubmit: (values: ProjectInput) => Promise<void>;
  submitLabel: string;
  showUrlExtract?: boolean;
}

export interface EntityConfig {
  labels: {
    navLabel: string;
    singular: string;
    plural: string;
    submitHeading: string;
    submitSubheading: string;
    submitThanksHeading: string;
    submitThanksBody: string;
    captureHeading: string;
    captureSubheading: string;
  };
  api: {
    list: (status?: DirectoryEntryStatus, limit?: number) => Promise<DirectoryEntry[]>;
    listNeedingPhoto: () => Promise<DirectoryEntry[]>;
    get: (id: string) => Promise<DirectoryEntry>;
    create: (body: DirectoryEntryInput) => Promise<DirectoryEntry>;
    update: (id: string, body: Partial<DirectoryEntryInput>) => Promise<DirectoryEntry>;
    updatePublic: (
      id: string,
      token: string,
      body: Partial<DirectoryEntryInput>,
    ) => Promise<DirectoryEntry>;
    getEditLink: (id: string) => Promise<DirectoryEntryEditLink>;
    approveSuggestedCategory: (id: string) => Promise<DirectoryEntry>;
  };
  renderForm: (props: FormRenderProps) => ReactNode;
}

export const directoryConfig: EntityConfig = {
  labels: {
    navLabel: "Community",
    singular: "entry",
    plural: "entries",
    submitHeading: "Submit an entry",
    submitSubheading:
      "Tell us about yourself or your group. We'll review what you share before it goes live.",
    submitThanksHeading: "Thanks for submitting!",
    submitThanksBody:
      "We'll review your submission and reach out if we need anything else before it's added to Community.",
    captureHeading: "Capture a new entry",
    captureSubheading:
      "Paste a link to pull what we can find, then fill in the rest. Saves straight to the live Community list.",
  },
  api: {
    list: listDirectoryEntries,
    listNeedingPhoto: listEntriesNeedingPhoto,
    get: getDirectoryEntry,
    create: createDirectoryEntry,
    update: updateDirectoryEntry,
    updatePublic: updateDirectoryEntryPublic,
    getEditLink: getDirectoryEntryEditLink,
    approveSuggestedCategory,
  },
  renderForm: ({ formKey, ...props }) => <DirectoryEntryForm key={formKey} {...props} />,
};

export const projectsConfig: EntityConfig = {
  labels: {
    navLabel: "Tech for Good",
    singular: "project",
    plural: "projects",
    submitHeading: "Submit a tech project",
    submitSubheading:
      "Tell us about an app, website, or other tech project you're building for social good. We'll review what you share before it goes live.",
    submitThanksHeading: "Thanks for submitting!",
    submitThanksBody:
      "We'll review your submission and reach out if we need anything else before it's added to Tech for Good.",
    captureHeading: "Capture a new tech project",
    captureSubheading:
      "Paste a link to pull what we can find, then fill in the rest. Saves straight to the live Tech for Good list.",
  },
  api: {
    list: listProjects,
    listNeedingPhoto: listProjectsNeedingPhoto,
    get: getProject,
    create: createProject,
    update: updateProject,
    updatePublic: updateProjectPublic,
    getEditLink: getProjectEditLink,
    approveSuggestedCategory: approveSuggestedProjectCategory,
  },
  renderForm: ({ formKey, ...props }) => <ProjectForm key={formKey} {...props} />,
};
