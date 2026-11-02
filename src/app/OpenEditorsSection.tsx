import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MdyarDocument } from "./documents";
import { FileTypeIcon, formatTabLabel } from "./fileTypeIcon";
import { IconTabClose } from "./icons";
import { CollapsibleExplorerSection } from "./ExplorerTree";

type Props = {
  documents: MdyarDocument[];
  activeId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
};

export function OpenEditorsSection({ documents, activeId, onSelectTab, onCloseTab }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  return (
    <CollapsibleExplorerSection
      title={t("sidebar.openEditors")}
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      {documents.length === 0 ? (
        <p className="mdyar-sidebar-empty">{t("workspace.noOpenTabs")}</p>
      ) : (
        <ul className="mdyar-sidebar-list">
          {documents.map((doc) => {
            const active = doc.id === activeId;
            const label = formatTabLabel(doc.fileName, doc.dirty);
            return (
              <li key={doc.id}>
                <button
                  type="button"
                  className={active ? "mdyar-sidebar-row is-active" : "mdyar-sidebar-row"}
                  onClick={() => onSelectTab(doc.id)}
                >
                  <FileTypeIcon fileName={doc.fileName} className="mdyar-sidebar-row-icon" />
                  <span className="mdyar-sidebar-row-label">{label}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="mdyar-sidebar-row-close"
                    aria-label={t("tabs.close", { name: doc.fileName })}
                    onClick={(event) => {
                      event.stopPropagation();
                      onCloseTab(doc.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        onCloseTab(doc.id);
                      }
                    }}
                  >
                    <IconTabClose />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </CollapsibleExplorerSection>
  );
}
