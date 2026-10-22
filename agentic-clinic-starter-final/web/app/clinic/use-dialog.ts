"use client";

import { useEffect, useId, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const FIELDS = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])';

// Dialogs that are open, innermost last. Only the innermost one handles keys.
const open: object[] = [];

/** Focusable elements inside a container, in DOM order, skipping hidden ones. */
export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.closest("[hidden]") && element.getClientRects().length > 0,
  );
}

/**
 * Wrapping Tab order: the element that should get focus when Tab (or Shift+Tab)
 * would leave the first or last element. Returns null when the browser's own
 * behaviour is fine. Pure so it can be tested without a DOM.
 */
export function trapTarget<T>(items: T[], active: T | null | undefined, shift: boolean): T | null {
  if (!items.length) return null;
  const first = items[0];
  const last = items[items.length - 1];
  const inside = active != null && items.includes(active);
  if (!inside) return shift ? last : first;
  if (shift && active === first) return last;
  if (!shift && active === last) return first;
  return null;
}

/**
 * Makes a modal accessible. Spread `dialogProps` on the `.dialog` element and
 * `titleProps` on its heading. On open, focus moves to the first field (or the
 * heading); Tab stays inside; Escape calls `onClose`; on close, focus returns
 * to whatever had it before the dialog opened.
 */
export function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const token = {};
    open.push(token);
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = root.querySelector<HTMLElement>(FIELDS);
    (first || root.querySelector<HTMLElement>("[data-dialog-title]"))?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (open[open.length - 1] !== token) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      } else if (event.key === "Tab") {
        const items = focusableIn(root);
        const target = trapTarget(items, document.activeElement as HTMLElement | null, event.shiftKey);
        if (target) {
          event.preventDefault();
          target.focus();
        } else if (!items.length) {
          event.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const at = open.indexOf(token);
      if (at >= 0) open.splice(at, 1);
      // Give the opener back its focus; when it is gone, fall back to a marked control.
      const back =
        opener && opener.isConnected && opener !== document.body
          ? opener
          : document.querySelector<HTMLElement>("[data-dialog-return]");
      back?.focus();
    };
  }, []);

  return {
    dialogProps: {
      ref,
      role: "dialog" as const,
      "aria-modal": true as const,
      "aria-labelledby": titleId,
    },
    titleProps: { id: titleId, tabIndex: -1, "data-dialog-title": "" },
  };
}
