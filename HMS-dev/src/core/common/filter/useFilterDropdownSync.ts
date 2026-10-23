"use client";

import { useEffect } from "react";

/** When the filter popup opens, reset draft fields from currently applied values. */
export const useFilterDropdownSync = (
  menuId: string,
  syncDraftFromApplied: () => void
): void => {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const menu = document.getElementById(menuId);
    const dropdown = menu?.closest(".dropdown");
    if (!dropdown) return;

    const onShow = () => syncDraftFromApplied();
    dropdown.addEventListener("show.bs.dropdown", onShow);
    return () => dropdown.removeEventListener("show.bs.dropdown", onShow);
  }, [menuId, syncDraftFromApplied]);
};
