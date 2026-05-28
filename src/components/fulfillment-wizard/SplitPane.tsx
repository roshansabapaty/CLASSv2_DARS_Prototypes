/**
 * SplitPane — Griffel wrapper around react-resizable-panels.
 *
 * Default 50/50 horizontal split. Below ~960px container width, stacks the
 * panels vertically. The handle is a thin gripped bar themed with Fluent
 * tokens.
 */

import * as React from "react";
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
} from "react-resizable-panels";
import { makeStyles, tokens } from "@fluentui/react-components";

export interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Container-width breakpoint to switch to vertical stack. Default 960. */
  stackBelow?: number;
}

const useStyles = makeStyles({
  host: {
    display: "block",
    width: "100%",
    minHeight: "320px",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflowX: "hidden",
    overflowY: "auto",
    paddingTop: tokens.spacingVerticalS,
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
  },
  panelLeft: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  panelRight: {
    backgroundColor: tokens.colorNeutralBackground1,
  },
  handle: {
    width: "4px",
    backgroundColor: tokens.colorNeutralStroke2,
    cursor: "col-resize",
    transitionProperty: "background-color",
    transitionDuration: tokens.durationFaster,
    ":hover": {
      backgroundColor: tokens.colorBrandStroke1,
    },
  },
  handleVertical: {
    height: "4px",
    width: "100%",
    cursor: "row-resize",
    backgroundColor: tokens.colorNeutralStroke2,
    ":hover": {
      backgroundColor: tokens.colorBrandStroke1,
    },
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: "320px",
  },
});

function useContainerWidth() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState<number>(1200);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function SplitPane({ left, right, stackBelow = 960 }: SplitPaneProps) {
  const styles = useStyles();
  const [hostRef, width] = useContainerWidth();
  const stack = width < stackBelow;

  if (stack) {
    return (
      <div ref={hostRef} className={styles.stack}>
        <div className={`${styles.panel} ${styles.panelLeft}`}>{left}</div>
        <div className={styles.handleVertical} aria-hidden="true" />
        <div className={`${styles.panel} ${styles.panelRight}`}>{right}</div>
      </div>
    );
  }

  return (
    <div ref={hostRef} className={styles.host}>
      <PanelGroup direction="horizontal" style={{ minHeight: 320 }}>
        <Panel defaultSize={50} minSize={28}>
          <div className={`${styles.panel} ${styles.panelLeft}`}>{left}</div>
        </Panel>
        <PanelResizeHandle className={styles.handle} />
        <Panel defaultSize={50} minSize={28}>
          <div className={`${styles.panel} ${styles.panelRight}`}>{right}</div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
