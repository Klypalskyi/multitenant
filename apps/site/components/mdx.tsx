import defaultMdxComponents from 'fumadocs-ui/mdx';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import type { MDXComponents } from 'mdx/types';
import { CliLocalNote } from '@/components/cli-local-note';
import { Mermaid } from '@/components/mermaid';
import {
  CliDlxTabs,
  InstallTabs,
  RunScriptTabs,
  WorkspaceRunTabs,
} from '@/components/package-manager';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    CliDlxTabs,
    CliLocalNote,
    InstallTabs,
    Mermaid,
    RunScriptTabs,
    WorkspaceRunTabs,
    Files,
    File,
    Folder,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
