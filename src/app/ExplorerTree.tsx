import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ExplorerNode } from "../platform/desktopExplorer";
import { folderDisplayName } from "../platform/desktopExplorer";
import { normalizeFsPath } from "./documents";
import { FileTypeIcon, formatTabLabel } from "./fileTypeIcon";
import { IconTabClose, MdIcon } from "./icons";

const TREE_INDENT_PX = 12;

type Props = {
  root: string;
  nodes: ExplorerNode[];
  loading: boolean;
  activeFilePath: string | null;
  dirtyFilePaths: ReadonlySet<string>;
  expandedDirs: Set<string>;
  onExpandedDirsChange: (updater: (prev: Set<string>) => Set<string>) => void;
  onOpenFile: (path: string) => void;
  onCloseFolder: () => void;
};

export function ExplorerFolderSection({
  root,
  nodes,
  loading,
  activeFilePath,
  dirtyFilePaths,
  expandedDirs,
  onExpandedDirsChange,
  onOpenFile,
  onCloseFolder,
}: Props) {
  const { t } = useTranslation();
  const [sectionOpen, setSectionOpen] = useState(true);

  useEffect(() => {
    setSectionOpen(true);
  }, [root]);

  const toggleDir = useCallback(
    (path: string) => {
      onExpandedDirsChange((prev) => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return next;
      });
    },
    [onExpandedDirsChange],
  );

  const title = folderDisplayName(root);

  return (
    <CollapsibleExplorerSection
      title={title}
      open={sectionOpen}
      onToggle={() => setSectionOpen((v) => !v)}
      trailing={
        <button
          type="button"
          className="mdyar-section-action"
          title={t("explorer.closeFolder")}
          aria-label={t("explorer.closeFolder")}
          onClick={(e) => {
            e.stopPropagation();
            onCloseFolder();
          }}
        >
          <IconTabClose />
        </button>
      }
    >
      {loading ? (
        <p className="mdyar-sidebar-empty">{t("explorer.loading")}</p>
      ) : nodes.length === 0 ? (
        <p className="mdyar-sidebar-empty">{t("explorer.emptyFolder")}</p>
      ) : (
        <ul className="mdyar-tree" role="tree">
          {nodes.map((node) => (
            <ExplorerTreeNode
              key={node.path}
              node={node}
              depth={0}
              expanded={expandedDirs}
              onToggleDir={toggleDir}
              activeFilePath={activeFilePath}
              dirtyFilePaths={dirtyFilePaths}
              onOpenFile={onOpenFile}
            />
          ))}
        </ul>
      )}
    </CollapsibleExplorerSection>
  );
}

export function CollapsibleExplorerSection({
  title,
  open,
  onToggle,
  trailing,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mdyar-sidebar-section">
      <div className="mdyar-section-head">
        <button
          type="button"
          className="mdyar-section-head-toggle"
          aria-expanded={open}
          onClick={onToggle}
        >
          <MdIcon
            name={open ? "expand_more" : "chevron_right"}
            className="mdyar-section-twistie"
          />
          <span className="mdyar-sidebar-section-title">{title}</span>
        </button>
        {trailing}
      </div>
      {open ? children : null}
    </section>
  );
}

function treeRowStyle(depth: number): CSSProperties {
  return {
    paddingInlineStart: `${4 + depth * TREE_INDENT_PX}px`,
  };
}

function ExplorerTreeNode({
  node,
  depth,
  expanded,
  onToggleDir,
  activeFilePath,
  dirtyFilePaths,
  onOpenFile,
}: {
  node: ExplorerNode;
  depth: number;
  expanded: Set<string>;
  onToggleDir: (path: string) => void;
  activeFilePath: string | null;
  dirtyFilePaths: ReadonlySet<string>;
  onOpenFile: (path: string) => void;
}) {
  if (node.kind === "dir") {
    const isOpen = expanded.has(node.path);
    return (
      <li className="mdyar-tree-item" role="treeitem" aria-expanded={isOpen}>
        <button
          type="button"
          className="mdyar-sidebar-row mdyar-tree-row is-folder"
          style={treeRowStyle(depth)}
          onClick={() => onToggleDir(node.path)}
        >
          <MdIcon
            name={isOpen ? "expand_more" : "chevron_right"}
            className="mdyar-tree-twistie"
          />
          <MdIcon
            name={isOpen ? "folder_open" : "folder"}
            className="mdyar-sidebar-row-icon mdyar-ft-icon mdyar-ft-icon--folder"
          />
          <span className="mdyar-sidebar-row-label">{node.name}</span>
        </button>
        {isOpen && node.children.length > 0 ? (
          <ul className="mdyar-tree" role="group">
            {node.children.map((child) => (
              <ExplorerTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggleDir={onToggleDir}
                activeFilePath={activeFilePath}
                dirtyFilePaths={dirtyFilePaths}
                onOpenFile={onOpenFile}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  const pathKey = normalizeFsPath(node.path);
  const active = activeFilePath !== null && normalizeFsPath(activeFilePath) === pathKey;
  const dirty = dirtyFilePaths.has(pathKey);
  const displayName = formatTabLabel(node.name, dirty);
  const rowClass = [
    "mdyar-sidebar-row",
    "mdyar-tree-row",
    "is-file",
    active ? "is-active" : "",
    !node.editable ? "is-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!node.editable) {
    return (
      <li className="mdyar-tree-item" role="treeitem">
        <div className={rowClass} style={treeRowStyle(depth)} aria-disabled="true" title={node.name}>
          <span className="mdyar-tree-twistie mdyar-tree-twistie--spacer" aria-hidden="true" />
          <FileTypeIcon fileName={node.name} className="mdyar-sidebar-row-icon" />
          <span className="mdyar-sidebar-row-label">{node.name}</span>
        </div>
      </li>
    );
  }

  return (
    <li className="mdyar-tree-item" role="treeitem">
      <button
        type="button"
        className={rowClass}
        style={treeRowStyle(depth)}
        title={node.path}
        onClick={() => onOpenFile(node.path)}
      >
        <span className="mdyar-tree-twistie mdyar-tree-twistie--spacer" aria-hidden="true" />
        <FileTypeIcon fileName={node.name} className="mdyar-sidebar-row-icon" />
        <span className="mdyar-sidebar-row-label">{displayName}</span>
      </button>
    </li>
  );
}
