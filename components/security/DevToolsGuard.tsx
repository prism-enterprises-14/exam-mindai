"use client";

import { useEffect } from "react";

/**
 * DevToolsGuard:
 * Protects client source code from user inspection:
 * 1. Blocks right-click context menu (Inspect Element, View Source).
 * 2. Blocks keyboard shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Cmd+Opt+I/J/C, Cmd+Opt+U).
 * 3. Clears developer console continuously.
 * 4. Activates anti-debugging traps when DevTools is opened.
 */
export function DevToolsGuard() {
  useEffect(() => {
    // 1. Disable Right-Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Disable DevTools and View Source Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Ctrl+Shift+I / Cmd+Opt+I (DevTools)
      // Ctrl+Shift+J / Cmd+Opt+J (Console)
      // Ctrl+Shift+C / Cmd+Opt+C (Element Picker)
      if (isCtrlOrMeta && (e.shiftKey || e.altKey)) {
        const key = e.key.toLowerCase();
        if (key === "i" || key === "j" || key === "c") {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      // Ctrl+U / Cmd+Opt+U (View Page Source)
      if (isCtrlOrMeta && e.key.toLowerCase() === "u") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S / Cmd+S (Save Page)
      if (isCtrlOrMeta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 3. Clear console periodically in production
    const consoleClearInterval = setInterval(() => {
      if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
        try {
          console.clear();
        } catch {
          // ignore
        }
      }
    }, 2000);

    // 4. Anti-debugger trap: pauses execution if DevTools is forcibly opened
    let debuggerInterval: any = null;
    if (process.env.NODE_ENV === "production") {
      debuggerInterval = setInterval(() => {
        const startTime = performance.now();
        // eslint-disable-next-line no-debugger
        debugger;
        const endTime = performance.now();
        // If debugger paused execution for > 100ms, user has DevTools open
        if (endTime - startTime > 100) {
          try {
            console.clear();
            document.body.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:sans-serif;'><h3>Developer Tools are restricted for security.</h3></div>";
          } catch {
            // ignore
          }
        }
      }, 1000);
    }

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      clearInterval(consoleClearInterval);
      if (debuggerInterval) clearInterval(debuggerInterval);
    };
  }, []);

  return null;
}
