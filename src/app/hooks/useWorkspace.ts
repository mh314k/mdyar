import { useCallback, useEffect, useRef, useState } from "react";
import type { i18n as I18n } from "i18next";
import { openMarkdownFiles, saveMarkdownFile } from "../../platform/fs";
import { saveDesktopWorkspace } from "../../platform/desktopSession";
import { saveWebWorkspace } from "../../platform/webWorkspace";
import { closeUnsavedMessage } from "../closeConfirm";
import {
  createDocument,
  getActiveDocument,
  mergeOpens,
  patchActiveDoc,
  removeDocumentFromWorkspace,
  type MdyarDocument,
  type WorkspaceSnapshot,
} from "../documents";
import { formatTabLabel } from "../fileTypeIcon";
import { APP_NAME } from "../meta";
import type { ViewMode } from "../viewMode";
import { bootstrapWorkspace } from "../workspaceBootstrap";

type Options = {
  isDesktop: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  i18n: I18n;
};

export function useWorkspace({ isDesktop, t, i18n }: Options) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>(bootstrapWorkspace);
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const saveRef = useRef<(saveAs?: boolean) => Promise<boolean>>(async () => false);

  const activeDoc = getActiveDocument(workspace);
  const hasOpenDocument = workspace.documents.length > 0;
  const content = activeDoc?.content ?? "";
  const fileName = activeDoc?.fileName ?? APP_NAME;
  const dirty = activeDoc?.dirty ?? false;
  const viewMode = activeDoc?.viewMode ?? "preview";
  const dirtyCount = workspace.documents.filter((d) => d.dirty).length;

  const persistWorkspace = useCallback(
    (snapshot: WorkspaceSnapshot) => {
      if (isDesktop) {
        void saveDesktopWorkspace(snapshot);
      } else {
        saveWebWorkspace(snapshot);
      }
    },
    [isDesktop],
  );

  useEffect(() => {
    if (!isDesktop) return;
    const title = `${formatTabLabel(fileName, dirty)} — ${APP_NAME}`;
    void import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
      getCurrentWindow().setTitle(title),
    );
  }, [fileName, dirty, isDesktop]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      persistWorkspace(workspaceRef.current);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [workspace, persistWorkspace]);

  useEffect(() => {
    const flush = () => persistWorkspace(workspaceRef.current);
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [persistWorkspace]);

  const onChange = useCallback((value: string) => {
    setWorkspace((ws) => patchActiveDoc(ws, { content: value, dirty: true }));
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setWorkspace((ws) => patchActiveDoc(ws, { viewMode: mode }));
  }, []);

  const handleSelectTab = useCallback((id: string) => {
    setWorkspace((ws) => ({ ...ws, activeId: id }));
  }, []);

  const handleNew = useCallback(() => {
    const doc = createDocument({
      content: "",
      fileName: "untitled.md",
      viewMode: "edit",
      dirty: false,
    });
    setWorkspace((ws) => ({
      ...ws,
      documents: [...ws.documents, doc],
      activeId: doc.id,
    }));
  }, []);

  const handleOpen = useCallback(async () => {
    const results = await openMarkdownFiles();
    if (results.length === 0) return;
    setWorkspace((ws) => mergeOpens(ws, results));
  }, []);

  const handleSave = useCallback(
    async (saveAs = false): Promise<boolean> => {
      const doc = getActiveDocument(workspaceRef.current);
      if (!doc) return false;
      try {
        const result = await saveMarkdownFile(
          doc.content,
          doc.filePath,
          doc.fileName,
          saveAs,
        );
        if (!result) return false;
        setWorkspace((ws) =>
          patchActiveDoc(ws, {
            filePath: result.path,
            fileName: result.name,
            dirty: false,
          }),
        );
        return true;
      } catch {
        window.alert(t("dialogs.saveFailed"));
        return false;
      }
    },
    [t],
  );

  saveRef.current = handleSave;

  const saveDocumentById = useCallback(
    async (docId: string, saveAs = false): Promise<boolean> => {
      const ws = workspaceRef.current;
      const doc = ws.documents.find((d) => d.id === docId);
      if (!doc) return false;
      const forceSaveAs = saveAs || (isDesktop && !doc.filePath);
      try {
        const result = await saveMarkdownFile(
          doc.content,
          doc.filePath,
          doc.fileName,
          forceSaveAs,
        );
        if (!result) return false;
        setWorkspace((current) => ({
          ...current,
          documents: current.documents.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  filePath: result.path,
                  fileName: result.name,
                  dirty: false,
                }
              : d,
          ),
        }));
        return true;
      } catch {
        window.alert(t("dialogs.saveFailed"));
        return false;
      }
    },
    [isDesktop, t],
  );

  const confirmCloseTab = useCallback(
    async (doc: MdyarDocument): Promise<"cancel" | "discard" | "save"> => {
      if (!doc.dirty) return "discard";

      if (isDesktop) {
        const { message } = await import("@tauri-apps/plugin-dialog");
        const yes = i18n.t("dialogs.yes");
        const no = i18n.t("dialogs.no");
        const cancel = i18n.t("dialogs.cancel");
        const choice = await message(
          closeUnsavedMessage(i18n.t("dialogs.tabCloseUnsavedBody"), [doc.fileName]),
          {
            title: i18n.t("dialogs.tabCloseUnsavedTitle"),
            kind: "warning",
            buttons: { yes, no, cancel },
          },
        );
        if (choice === yes || choice === "Yes") return "save";
        if (choice === no || choice === "No") return "discard";
        return "cancel";
      }

      if (window.confirm(t("dialogs.tabCloseSavePrompt"))) {
        return "save";
      }
      if (window.confirm(t("dialogs.unsavedBody"))) {
        return "discard";
      }
      return "cancel";
    },
    [isDesktop, i18n, t],
  );

  const handleCloseTab = useCallback(
    async (id: string) => {
      const ws = workspaceRef.current;
      const doc = ws.documents.find((d) => d.id === id);
      if (!doc) return;

      const decision = await confirmCloseTab(doc);
      if (decision === "cancel") return;
      if (decision === "save") {
        const saved = await saveDocumentById(id, false);
        if (!saved) return;
      }

      const next = removeDocumentFromWorkspace(workspaceRef.current, id);
      setWorkspace(next);
      persistWorkspace(next);
    },
    [confirmCloseTab, persistWorkspace, saveDocumentById],
  );

  return {
    workspace,
    setWorkspace,
    workspaceRef,
    saveRef,
    activeDoc,
    hasOpenDocument,
    content,
    fileName,
    dirty,
    viewMode,
    dirtyCount,
    onChange,
    setViewMode,
    handleSelectTab,
    handleNew,
    handleOpen,
    handleSave,
    handleCloseTab,
  };
}
