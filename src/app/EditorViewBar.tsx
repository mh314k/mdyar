import { useTranslation } from "react-i18next";
import { IconEdit, IconPreview, IconSplit } from "./icons";
import type { ViewMode } from "./viewMode";

type Props = {
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
};

export function EditorViewBar({ viewMode, onViewMode }: Props) {
  const { t } = useTranslation();

  return (
    <div className="mdyar-pane-viewfloat" role="toolbar" aria-label={t("menu.view")}>
      <div
        className="mdyar-toolbar-group mdyar-segmented mdyar-pane-viewfloat-modes"
        role="group"
        aria-label={t("menu.view")}
      >
        {(
          [
            ["preview", "toolbar.previewOnly", IconPreview],
            ["split", "toolbar.splitView", IconSplit],
            ["edit", "toolbar.editOnly", IconEdit],
          ] as const
        ).map(([mode, key, Icon]) => (
          <button
            key={mode}
            type="button"
            className={viewMode === mode ? "is-active" : undefined}
            onClick={() => onViewMode(mode)}
            title={t(key)}
            aria-label={t(key)}
            aria-pressed={viewMode === mode}
          >
            <Icon />
          </button>
        ))}
      </div>
    </div>
  );
}
