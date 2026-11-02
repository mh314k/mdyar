import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import type { ExplorerNode } from "../platform/desktopExplorer";
import { folderDisplayName } from "../platform/desktopExplorer";
import { normalizeFsPath } from "./documents";
import type { ExplorerClipboard, ExplorerSelection } from "./explorerClipboard";
import type { ExplorerInlineDraft } from "./explorerInline";
import {
  ExplorerContextMenu,
  type ExplorerMenuAction,
} from "./ExplorerContextMenu";
import { ExplorerInlineInput } from "./ExplorerInlineInput";
import { FileTypeIcon, formatTabLabel } from "./fileTypeIcon";
import { IconTabClose, MdIcon } from "./icons";

const TREE_INDENT_PX = 12;

type Props = {
  root: string;
  nodes: ExplorerNode[];
  loading: boolean;
  activeFilePath: string | null;
  openFilePaths: ReadonlySet<string>;
  dirtyFilePaths: ReadonlySet<string>;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
  onOpenFile: (path: string) => void;
  onCloseFolder: () => void;
  fileOpsEnabled?: boolean;
  selection: ExplorerSelection;
  clipboard: ExplorerClipboard | null;
  inlineDraft: ExplorerInlineDraft | null;
  onSelect: (selection: ExplorerSelection) => void;
  onMenuAction: (action: ExplorerMenuAction, selection: ExplorerSelection) => void;
  onInlineNameChange: (name: string) => void;
  onInlineSubmit: () => void;
  onInlineCancel: () => void;
};

export function ExplorerFolderSection({
  root,
  nodes,
  loading,
  activeFilePath,
  openFilePaths,
  dirtyFilePaths,
  expandedDirs,
  onToggleDir,
  onOpenFile,
  onCloseFolder,
  fileOpsEnabled = false,
  selection,
  clipboard,
  inlineDraft,
  onSelect,
  onMenuAction,
  onInlineNameChange,
  onInlineSubmit,
  onInlineCancel,
}: Props) {
  const { t } = useTranslation();
  const [sectionOpen, setSectionOpen] = useState(true);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setSectionOpen(true);
  }, [root]);

  const openMenu = useCallback(
    (event: React.MouseEvent, next: ExplorerSelection) => {
      if (!fileOpsEnabled) return;
      event.preventDefault();
      event.stopPropagation();
      onSelect(next);
      setMenu({ x: event.clientX, y: event.clientY });
    },
    [fileOpsEnabled, onSelect],
  );

  const title = folderDisplayName(root);
  const rootCreateDraft =
    inlineDraft &&
    (inlineDraft.mode === "create-file" || inlineDraft.mode === "create-folder") &&
    normalizeFsPath(inlineDraft.parentDir) === normalizeFsPath(root)
      ? inlineDraft
      : null;

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
      <div
        className="mdyar-explorer-pane"
        tabIndex={fileOpsEnabled ? 0 : undefined}
        onContextMenu={(event) => openMenu(event, { path: root, kind: "dir" })}
      >
        {loading ? (
          <p className="mdyar-sidebar-empty">{t("explorer.loading")}</p>
        ) : nodes.length === 0 && !rootCreateDraft ? (
          <p className="mdyar-sidebar-empty">{t("explorer.emptyFolder")}</p>
        ) : (
          <ul className="mdyar-tree" role="tree">
            {nodes.map((node) => (
              <ExplorerTreeNode
                key={node.path}
                node={node}
                depth={0}
                expanded={expandedDirs}
                onToggleDir={onToggleDir}
                activeFilePath={activeFilePath}
                openFilePaths={openFilePaths}
                dirtyFilePaths={dirtyFilePaths}
                selection={selection}
                clipboard={clipboard}
                inlineDraft={inlineDraft}
                onSelect={onSelect}
                onOpenFile={onOpenFile}
                onContextMenu={openMenu}
                onInlineNameChange={onInlineNameChange}
                onInlineSubmit={onInlineSubmit}
                onInlineCancel={onInlineCancel}
                t={t}
              />
            ))}
            {rootCreateDraft ? (
              <li className="mdyar-tree-item" role="treeitem">
                <ExplorerInlineInput
                  value={rootCreateDraft.draftName}
                  depth={0}
                  ariaLabel={
                    rootCreateDraft.mode === "create-file"
                      ? t("explorer.newFilePrompt")
                      : t("explorer.newFolderPrompt")
                  }
                  icon={
                    rootCreateDraft.mode === "create-file" ? (
                      <FileTypeIcon fileName={rootCreateDraft.draftName || "file.md"} className="mdyar-sidebar-row-icon" />
                    ) : (
                      <MdIcon name="folder" className="mdyar-sidebar-row-icon mdyar-ft-icon mdyar-ft-icon--folder" />
                    )
                  }
                  onChange={onInlineNameChange}
                  onSubmit={onInlineSubmit}
                  onCancel={onInlineCancel}
                />
              </li>
            ) : null}
          </ul>
        )}
      </div>

      {menu ? (
        <ExplorerContextMenu
          x={menu.x}
          y={menu.y}
          canPaste={Boolean(clipboard)}
          hasTarget={Boolean(selection) && normalizeFsPath(selection!.path) !== normalizeFsPath(root)}
          onClose={() => setMenu(null)}
          onAction={(action) => onMenuAction(action, selection ?? { path: root, kind: "dir" })}
        />
      ) : null}
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
  openFilePaths,
  dirtyFilePaths,
  selection,
  clipboard,
  inlineDraft,
  onSelect,
  onOpenFile,
  onContextMenu,
  onInlineNameChange,
  onInlineSubmit,
  onInlineCancel,
  t,
}: {
  node: ExplorerNode;
  depth: number;
  expanded: Set<string>;
  onToggleDir: (path: string) => void;
  activeFilePath: string | null;
  openFilePaths: ReadonlySet<string>;
  dirtyFilePaths: ReadonlySet<string>;
  selection: ExplorerSelection;
  clipboard: ExplorerClipboard | null;
  inlineDraft: ExplorerInlineDraft | null;
  onSelect: (selection: ExplorerSelection) => void;
  onOpenFile: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, selection: ExplorerSelection) => void;
  onInlineNameChange: (name: string) => void;
  onInlineSubmit: () => void;
  onInlineCancel: () => void;
  t: (key: string) => string;
}) {
  const selected =
    selection !== null && normalizeFsPath(selection.path) === normalizeFsPath(node.path);
  const cutAway =
    clipboard?.mode === "cut" &&
    normalizeFsPath(clipboard.path) === normalizeFsPath(node.path);

  const renaming =
    inlineDraft?.mode === "rename" &&
    normalizeFsPath(inlineDraft.path) === normalizeFsPath(node.path);

  const createDraftHere =
    inlineDraft &&
    (inlineDraft.mode === "create-file" || inlineDraft.mode === "create-folder") &&
    node.kind === "dir" &&
    normalizeFsPath(inlineDraft.parentDir) === normalizeFsPath(node.path)
      ? inlineDraft
      : null;

  if (node.kind === "dir") {
    const isOpen = expanded.has(node.path);
    return (
      <li className="mdyar-tree-item" role="treeitem" aria-expanded={isOpen}>
        {renaming ? (
          <ExplorerInlineInput
            value={inlineDraft!.draftName}
            depth={depth}
            ariaLabel={t("explorer.renamePrompt")}
            icon={
              <MdIcon
                name={isOpen ? "folder_open" : "folder"}
                className="mdyar-sidebar-row-icon mdyar-ft-icon mdyar-ft-icon--folder"
              />
            }
            onChange={onInlineNameChange}
            onSubmit={onInlineSubmit}
            onCancel={onInlineCancel}
          />
        ) : (
          <button
            type="button"
            className={[
              "mdyar-sidebar-row",
              "mdyar-tree-row",
              "is-folder",
              selected ? "is-selected" : "",
              cutAway ? "is-cut" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={treeRowStyle(depth)}
            onClick={() => {
              onSelect({ path: node.path, kind: "dir" });
              onToggleDir(node.path);
            }}
            onContextMenu={(event) =>
              onContextMenu(event, { path: node.path, kind: "dir" })
            }
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
        )}
        {isOpen ? (
          <ul className="mdyar-tree" role="group">
            {!node.childrenLoaded ? (
              <li className="mdyar-tree-item">
                <p className="mdyar-sidebar-empty mdyar-tree-loading">{t("explorer.loading")}</p>
              </li>
            ) : (
              node.children.map((child) => (
                <ExplorerTreeNode
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  expanded={expanded}
                  onToggleDir={onToggleDir}
                  activeFilePath={activeFilePath}
                  openFilePaths={openFilePaths}
                  dirtyFilePaths={dirtyFilePaths}
                  selection={selection}
                  clipboard={clipboard}
                  inlineDraft={inlineDraft}
                  onSelect={onSelect}
                  onOpenFile={onOpenFile}
                  onContextMenu={onContextMenu}
                  onInlineNameChange={onInlineNameChange}
                  onInlineSubmit={onInlineSubmit}
                  onInlineCancel={onInlineCancel}
                  t={t}
                />
              ))
            )}
            {createDraftHere ? (
              <li className="mdyar-tree-item" role="treeitem">
                <ExplorerInlineInput
                  value={createDraftHere.draftName}
                  depth={depth + 1}
                  ariaLabel={
                    createDraftHere.mode === "create-file"
                      ? t("explorer.newFilePrompt")
                      : t("explorer.newFolderPrompt")
                  }
                  icon={
                    createDraftHere.mode === "create-file" ? (
                      <FileTypeIcon
                        fileName={createDraftHere.draftName || "file.md"}
                        className="mdyar-sidebar-row-icon"
                      />
                    ) : (
                      <MdIcon
                        name="folder"
                        className="mdyar-sidebar-row-icon mdyar-ft-icon mdyar-ft-icon--folder"
                      />
                    )
                  }
                  onChange={onInlineNameChange}
                  onSubmit={onInlineSubmit}
                  onCancel={onInlineCancel}
                />
              </li>
            ) : null}
          </ul>
        ) : null}
      </li>
    );
  }

  if (renaming) {
    return (
      <li className="mdyar-tree-item" role="treeitem">
        <ExplorerInlineInput
          value={inlineDraft!.draftName}
          depth={depth}
          ariaLabel={t("explorer.renamePrompt")}
          icon={<FileTypeIcon fileName={node.name} className="mdyar-sidebar-row-icon" />}
          onChange={onInlineNameChange}
          onSubmit={onInlineSubmit}
          onCancel={onInlineCancel}
        />
      </li>
    );
  }

  const pathKey = normalizeFsPath(node.path);
  const active = activeFilePath !== null && normalizeFsPath(activeFilePath) === pathKey;
  const isOpenTab = openFilePaths.has(pathKey);
  const dirty = dirtyFilePaths.has(pathKey);
  const displayName = formatTabLabel(node.name, dirty);
  const rowClass = [
    "mdyar-sidebar-row",
    "mdyar-tree-row",
    "is-file",
    active ? "is-active" : "",
    selected ? "is-selected" : "",
    cutAway ? "is-cut" : "",
    isOpenTab && !active ? "is-open-tab" : "",
    !node.editable ? "is-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!node.editable) {
    return (
      <li className="mdyar-tree-item" role="treeitem">
        <div
          className={rowClass}
          style={treeRowStyle(depth)}
          aria-disabled="true"
          title={node.name}
          onClick={() => onSelect({ path: node.path, kind: "file" })}
          onContextMenu={(event) =>
            onContextMenu(event, { path: node.path, kind: "file" })
          }
        >
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
        onClick={() => {
          onSelect({ path: node.path, kind: "file" });
          onOpenFile(node.path);
        }}
        onContextMenu={(event) =>
          onContextMenu(event, { path: node.path, kind: "file" })
        }
      >
        <span className="mdyar-tree-twistie mdyar-tree-twistie--spacer" aria-hidden="true" />
        <FileTypeIcon fileName={node.name} className="mdyar-sidebar-row-icon" />
        <span className="mdyar-sidebar-row-label">{displayName}</span>
      </button>
    </li>
  );
}
