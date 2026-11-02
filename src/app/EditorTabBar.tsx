import { useTranslation } from "react-i18next";
import type { MdyarDocument } from "./documents";
import { FileTypeIcon, formatTabLabel } from "./fileTypeIcon";
import { IconTabClose } from "./icons";

type Props = {
  documents: MdyarDocument[];
  activeId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
};

export function EditorTabBar({ documents, activeId, onSelectTab, onCloseTab }: Props) {
  const { t } = useTranslation();

  if (documents.length === 0) {
    return (
      <div className="mdyar-tabstrip mdyar-tabstrip-empty">
        <span className="mdyar-tabstrip-empty-label">{t("workspace.noOpenTabs")}</span>
      </div>
    );
  }

  return (
    <div className="mdyar-tabstrip">
      <div className="mdyar-tabs" role="tablist" aria-label={t("tabs.list")}>
        {documents.map((doc) => {
          const active = doc.id === activeId;
          const label = formatTabLabel(doc.fileName, doc.dirty);
          return (
            <div
              key={doc.id}
              className={active ? "mdyar-tab is-active" : "mdyar-tab"}
              role="presentation"
            >
              <button
                type="button"
                className="mdyar-tab-main"
                role="tab"
                aria-selected={active}
                title={label}
                onClick={() => onSelectTab(doc.id)}
              >
                <FileTypeIcon fileName={doc.fileName} className="mdyar-tab-file-icon" />
                <span className="mdyar-tab-label">{label}</span>
              </button>
              <button
                type="button"
                className="mdyar-tab-close"
                aria-label={t("tabs.close", { name: doc.fileName })}
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseTab(doc.id);
                }}
              >
                <IconTabClose />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
