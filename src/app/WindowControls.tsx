import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IconClose, IconMaximize, IconMinimize, IconRestore } from "./icons";

export function WindowControls() {
  const { t } = useTranslation();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      if (cancelled) return;
      setMaximized(await win.isMaximized());
      unlisten = await win.onResized(async () => {
        if (!cancelled) setMaximized(await win.isMaximized());
      });
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const runWindow = async (action: "minimize" | "toggleMaximize" | "close") => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    if (action === "minimize") await win.minimize();
    else if (action === "toggleMaximize") await win.toggleMaximize();
    else await win.close();
  };

  return (
    <div className="mdyar-window-controls" role="group" aria-label={t("window.controls")}>
      <button
        type="button"
        className="mdyar-window-btn"
        aria-label={t("window.minimize")}
        onClick={() => void runWindow("minimize")}
      >
        <IconMinimize />
      </button>
      <button
        type="button"
        className="mdyar-window-btn"
        aria-label={maximized ? t("window.restore") : t("window.maximize")}
        onClick={() => void runWindow("toggleMaximize")}
      >
        {maximized ? <IconRestore /> : <IconMaximize />}
      </button>
      <button
        type="button"
        className="mdyar-window-btn is-close"
        aria-label={t("window.close")}
        onClick={() => void runWindow("close")}
      >
        <IconClose />
      </button>
    </div>
  );
}
