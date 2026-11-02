import { createDocument, type WorkspaceSnapshot } from "./documents";
import { SAMPLE_MARKDOWN } from "./sample";
import { loadWebWorkspace } from "../platform/webWorkspace";

export function defaultWorkspace(): WorkspaceSnapshot {
  const doc = createDocument({
    content: SAMPLE_MARKDOWN,
    fileName: "welcome.md",
    viewMode: "preview",
    dirty: false,
  });
  return { documents: [doc], activeId: doc.id, folderRoot: null };
}

export function bootstrapWorkspace(): WorkspaceSnapshot {
  return loadWebWorkspace() ?? defaultWorkspace();
}
