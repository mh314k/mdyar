import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import {
  drainOsOpenPaths,
  listenForOsOpen,
  readTextAtPath,
  type OpenResult,
} from "../../platform/fs";
import { flushDesktopSession, loadDesktopWorkspace } from "../../platform/desktopSession";
import { mergeOpens, type WorkspaceSnapshot } from "../documents";

type Options = {
  isDesktop: boolean;
  workspaceRef: React.MutableRefObject<WorkspaceSnapshot>;
  setWorkspace: Dispatch<SetStateAction<WorkspaceSnapshot>>;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export function useDesktopLifecycle({
  isDesktop,
  workspaceRef,
  setWorkspace,
  t,
}: Options) {
  const loadOsPathsRef = useRef<(paths: string[]) => Promise<void>>(async () => {});

  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    void loadDesktopWorkspace().then((stored) => {
      if (!cancelled && stored) setWorkspace(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [isDesktop, setWorkspace]);

  loadOsPathsRef.current = async (paths: string[]) => {
    if (paths.length === 0) return;
    const results: OpenResult[] = [];
    for (const path of paths) {
      const result = await readTextAtPath(path);
      if (!result) {
        window.alert(t("dialogs.openFailed", { name: path }));
        continue;
      }
      results.push(result);
    }
    if (results.length === 0) return;
    setWorkspace((ws) => mergeOpens(ws, results));
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const stop = await listenForOsOpen(() => {
        void drainOsOpenPaths().then((paths) => loadOsPathsRef.current(paths));
      });
      if (cancelled) {
        stop();
        return;
      }
      unlisten = stop;
      const paths = await drainOsOpenPaths();
      if (!cancelled) await loadOsPathsRef.current(paths);
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [t]);

  useEffect(() => {
    if (!isDesktop) return;
    let unlisten: (() => void) | undefined;
    let disposed = false;
    let closing = false;

    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      const stop = await win.onCloseRequested(async (event) => {
        event.preventDefault();
        if (closing || disposed) return;
        closing = true;
        try {
          await flushDesktopSession(workspaceRef.current);
          if (disposed) return;
          await win.destroy();
        } catch {
          window.alert(t("dialogs.autosaveFailed"));
        } finally {
          closing = false;
        }
      });
      if (disposed) {
        stop();
        return;
      }
      unlisten = stop;
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [isDesktop, t, workspaceRef]);
}
