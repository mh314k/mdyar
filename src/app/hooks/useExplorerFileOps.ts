import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  copyPathInto,
  createDirectory,
  createTextFile,
  deletePath,
  explorerBasename,
  explorerParentDir,
  explorerParentOf,
  movePathInto,
  renamePath,
  type PathKind,
} from "../../platform/desktopFsOps";
import type { ExplorerClipboard, ExplorerSelection } from "../explorerClipboard";
import type { ExplorerMenuAction } from "../ExplorerContextMenu";
import type { ExplorerInlineDraft } from "../explorerInline";

type Options = {
  enabled: boolean;
  folderRoot: string | null;
  onRefresh: () => void;
  onPathMoved: (from: string, to: string) => void;
  onPathRemoved: (path: string) => void;
  onOpenCreatedFile?: (path: string) => void;
  onEnsureExpanded?: (dirPath: string) => void;
};

export function useExplorerFileOps({
  enabled,
  folderRoot,
  onRefresh,
  onPathMoved,
  onPathRemoved,
  onOpenCreatedFile,
  onEnsureExpanded,
}: Options) {
  const { t, i18n } = useTranslation();
  const [selection, setSelection] = useState<ExplorerSelection>(null);
  const [clipboard, setClipboard] = useState<ExplorerClipboard | null>(null);
  const [inlineDraft, setInlineDraft] = useState<ExplorerInlineDraft | null>(null);

  useEffect(() => {
    setSelection(null);
    setClipboard(null);
    setInlineDraft(null);
  }, [folderRoot]);

  const targetDirFor = useCallback(
    (sel: ExplorerSelection): string | null => {
      if (!folderRoot) return null;
      if (!sel) return folderRoot;
      if (sel.kind === "dir") return sel.path;
      return explorerParentOf(sel.path);
    },
    [folderRoot],
  );

  const confirmDelete = useCallback(
    async (name: string, kind: PathKind): Promise<boolean> => {
      const body =
        kind === "dir"
          ? t("explorer.deleteFolderConfirm", { name })
          : t("explorer.deleteFileConfirm", { name });
      try {
        const { ask } = await import("@tauri-apps/plugin-dialog");
        return await ask(body, {
          title: t("explorer.delete"),
          kind: "warning",
          okLabel: t("explorer.delete"),
          cancelLabel: i18n.t("dialogs.cancel"),
        });
      } catch {
        return window.confirm(body);
      }
    },
    [i18n, t],
  );

  const beginCreateFile = useCallback(
    (sel: ExplorerSelection) => {
      if (!enabled || !folderRoot) return;
      const dir = targetDirFor(sel);
      if (!dir) return;
      onEnsureExpanded?.(dir);
      setInlineDraft({ mode: "create-file", parentDir: dir, draftName: "untitled.md" });
    },
    [enabled, folderRoot, onEnsureExpanded, targetDirFor],
  );

  const beginCreateFolder = useCallback(
    (sel: ExplorerSelection) => {
      if (!enabled || !folderRoot) return;
      const dir = targetDirFor(sel);
      if (!dir) return;
      onEnsureExpanded?.(dir);
      setInlineDraft({ mode: "create-folder", parentDir: dir, draftName: "New Folder" });
    },
    [enabled, folderRoot, onEnsureExpanded, targetDirFor],
  );

  const beginRename = useCallback(
    (sel: ExplorerSelection) => {
      if (!enabled || !folderRoot || !sel) return;
      if (normalizeSame(sel.path, folderRoot)) return;
      setInlineDraft({
        mode: "rename",
        path: sel.path,
        kind: sel.kind,
        draftName: explorerBasename(sel.path),
      });
    },
    [enabled, folderRoot],
  );

  const cancelInline = useCallback(() => setInlineDraft(null), []);

  const setInlineName = useCallback((draftName: string) => {
    setInlineDraft((prev) => (prev ? { ...prev, draftName } : prev));
  }, []);

  const submitInline = useCallback(async () => {
    if (!inlineDraft || !folderRoot) return;
    const name = inlineDraft.draftName.trim();
    if (!name) {
      setInlineDraft(null);
      return;
    }

    try {
      if (inlineDraft.mode === "create-file") {
        const path = await createTextFile(inlineDraft.parentDir, name, "");
        setInlineDraft(null);
        onRefresh();
        onOpenCreatedFile?.(path);
        setSelection({ path, kind: "file" });
        return;
      }
      if (inlineDraft.mode === "create-folder") {
        const path = await createDirectory(inlineDraft.parentDir, name);
        setInlineDraft(null);
        onRefresh();
        setSelection({ path, kind: "dir" });
        return;
      }
      if (inlineDraft.mode === "rename") {
        const path = await renamePath(inlineDraft.path, name);
        setInlineDraft(null);
        onPathMoved(inlineDraft.path, path);
        setSelection({ path, kind: inlineDraft.kind });
        onRefresh();
      }
    } catch {
      window.alert(t("explorer.opFailed"));
      setInlineDraft(null);
    }
  }, [folderRoot, inlineDraft, onOpenCreatedFile, onPathMoved, onRefresh, t]);

  const runDelete = useCallback(
    async (sel: ExplorerSelection) => {
      if (!enabled || !folderRoot || !sel) return;
      if (normalizeSame(sel.path, folderRoot)) return;
      const ok = await confirmDelete(explorerBasename(sel.path), sel.kind);
      if (!ok) return;
      try {
        await deletePath(sel.path);
        onPathRemoved(sel.path);
        setSelection(null);
        setInlineDraft(null);
        if (clipboard && normalizeSame(clipboard.path, sel.path)) {
          setClipboard(null);
        }
        onRefresh();
      } catch {
        window.alert(t("explorer.opFailed"));
      }
    },
    [clipboard, confirmDelete, enabled, folderRoot, onPathRemoved, onRefresh, t],
  );

  const runPaste = useCallback(
    async (sel: ExplorerSelection) => {
      if (!enabled || !folderRoot || !clipboard) return;
      const dest = targetDirFor(sel) ?? folderRoot;
      if (
        clipboard.kind === "dir" &&
        (normalizeSame(dest, clipboard.path) ||
          normalizeFs(dest).startsWith(`${normalizeFs(clipboard.path)}/`))
      ) {
        window.alert(t("explorer.pasteIntoSelf"));
        return;
      }
      try {
        onEnsureExpanded?.(dest);
        if (clipboard.mode === "copy") {
          const path = await copyPathInto(clipboard.path, dest);
          setSelection({ path, kind: clipboard.kind });
        } else {
          const path = await movePathInto(clipboard.path, dest);
          onPathMoved(clipboard.path, path);
          setClipboard(null);
          setSelection({ path, kind: clipboard.kind });
        }
        onRefresh();
      } catch {
        window.alert(t("explorer.opFailed"));
      }
    },
    [clipboard, enabled, folderRoot, onEnsureExpanded, onPathMoved, onRefresh, t, targetDirFor],
  );

  const handleMenuAction = useCallback(
    (action: ExplorerMenuAction, sel: ExplorerSelection) => {
      if (action === "newFile") beginCreateFile(sel);
      else if (action === "newFolder") beginCreateFolder(sel);
      else if (action === "cut" && sel) {
        if (normalizeSame(sel.path, folderRoot ?? "")) return;
        setClipboard({ mode: "cut", path: sel.path, kind: sel.kind });
      } else if (action === "copy" && sel) {
        if (normalizeSame(sel.path, folderRoot ?? "")) return;
        setClipboard({ mode: "copy", path: sel.path, kind: sel.kind });
      } else if (action === "paste") void runPaste(sel);
      else if (action === "rename") beginRename(sel);
      else if (action === "delete") void runDelete(sel);
    },
    [beginCreateFile, beginCreateFolder, beginRename, folderRoot, runDelete, runPaste],
  );

  useEffect(() => {
    if (!enabled || !folderRoot || inlineDraft) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".mdyar-sidebar")) return;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;

      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "c" && selection) {
        if (normalizeSame(selection.path, folderRoot)) return;
        event.preventDefault();
        setClipboard({ mode: "copy", path: selection.path, kind: selection.kind });
        return;
      }
      if (mod && event.key.toLowerCase() === "x" && selection) {
        if (normalizeSame(selection.path, folderRoot)) return;
        event.preventDefault();
        setClipboard({ mode: "cut", path: selection.path, kind: selection.kind });
        return;
      }
      if (mod && event.key.toLowerCase() === "v") {
        event.preventDefault();
        void runPaste(selection ?? { path: folderRoot, kind: "dir" });
        return;
      }
      if (event.key === "F2" && selection) {
        event.preventDefault();
        beginRename(selection);
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selection) {
        if (normalizeSame(selection.path, folderRoot)) return;
        event.preventDefault();
        void runDelete(selection);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [beginRename, enabled, folderRoot, inlineDraft, runDelete, runPaste, selection]);

  return {
    selection,
    setSelection,
    clipboard,
    inlineDraft,
    setInlineName,
    submitInline,
    cancelInline,
    handleMenuAction,
    createFileInSelection: () =>
      beginCreateFile(selection ?? (folderRoot ? { path: folderRoot, kind: "dir" } : null)),
    createFolderInSelection: () =>
      beginCreateFolder(selection ?? (folderRoot ? { path: folderRoot, kind: "dir" } : null)),
    targetDirHint: selection
      ? selection.kind === "dir"
        ? selection.path
        : explorerParentDir(selection.path, folderRoot ?? selection.path)
      : folderRoot,
  };
}

function normalizeFs(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

function normalizeSame(a: string, b: string): boolean {
  return normalizeFs(a) === normalizeFs(b);
}
