import { useTranslation } from "react-i18next";
import { MdIcon } from "./icons";
import type { ActivityView } from "./activityView";

type Props = {
  activeView: ActivityView | null;
  sidebarOpen: boolean;
  onSelectView: (view: ActivityView) => void;
  onToggleSidebar: () => void;
};

export function ActivityBar({
  activeView,
  sidebarOpen,
  onSelectView,
  onToggleSidebar,
}: Props) {
  const { t } = useTranslation();

  const explorerActive = sidebarOpen && activeView === "explorer";
  const settingsActive = sidebarOpen && activeView === "settings";

  return (
    <nav className="mdyar-activitybar" aria-label={t("activity.bar")}>
      <div className="mdyar-activitybar-top">
        <button
          type="button"
          className={explorerActive ? "mdyar-activity-item is-active" : "mdyar-activity-item"}
          title={t("activity.explorer")}
          aria-label={t("activity.explorer")}
          aria-pressed={explorerActive}
          onClick={() => onSelectView("explorer")}
        >
          <MdIcon name="account_tree" />
        </button>
      </div>
      <div className="mdyar-activitybar-bottom">
        <button
          type="button"
          className={settingsActive ? "mdyar-activity-item is-active" : "mdyar-activity-item"}
          title={t("activity.settings")}
          aria-label={t("activity.settings")}
          aria-pressed={settingsActive}
          onClick={() => onSelectView("settings")}
        >
          <MdIcon name="settings" />
        </button>
        <button
          type="button"
          className="mdyar-activity-item"
          title={t("activity.toggleSidebar")}
          aria-label={t("activity.toggleSidebar")}
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
        >
          <MdIcon name={sidebarOpen ? "chevron_left" : "chevron_right"} />
        </button>
      </div>
    </nav>
  );
}
