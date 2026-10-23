"use client";

import { useEffect } from "react";
import { closeFilterDropdown } from "./filterDropdownUtils";

/**
 * Filter popups use react-select / date pickers that render menus outside the
 * dropdown panel. Bootstrap must not auto-close on those clicks — only via
 * Filter / Close controls.
 */
const FilterDropdownInit = () => {
  useEffect(() => {
    const getDropdownApi = () => {
      if (typeof window === "undefined") return undefined;
      return (
        window as Window & {
          bootstrap?: {
            Dropdown?: {
              getInstance: (el: Element) => { _config?: { autoClose?: boolean | string } } | null;
              getOrCreateInstance: (
                el: Element,
                options?: { autoClose?: boolean | string }
              ) => { _config?: { autoClose?: boolean | string } };
            };
          };
        }
      ).bootstrap?.Dropdown;
    };

    const setFilterDropdownAutoClose = (toggle: HTMLElement) => {
      toggle.setAttribute("data-bs-auto-close", "false");
      const Dropdown = getDropdownApi();
      if (!Dropdown) return;
      const instance = Dropdown.getOrCreateInstance(toggle, { autoClose: false });
      if (instance._config) {
        instance._config.autoClose = false;
      }
    };

    const configureFilterDropdowns = () => {
      document.querySelectorAll(".dropdown").forEach((dropdown) => {
        if (!dropdown.querySelector(".filter-dropdown")) return;
        const toggle = dropdown.querySelector<HTMLElement>('[data-bs-toggle="dropdown"]');
        if (toggle) setFilterDropdownAutoClose(toggle);
      });
    };

    const handleShow = (event: Event) => {
      const toggle = event.target;
      if (!(toggle instanceof HTMLElement)) return;
      const dropdown = toggle.closest(".dropdown");
      if (!dropdown?.querySelector(".filter-dropdown")) return;
      setFilterDropdownAutoClose(toggle);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const closeControl = target.closest<HTMLElement>(
        "#close-filter, .close-filter, [data-filter-close]"
      );
      if (!closeControl) return;

      const menu = closeControl.closest(".filter-dropdown");
      if (!menu) return;

      event.preventDefault();
      closeFilterDropdown(menu.id || "filter-dropdown");
    };

    configureFilterDropdowns();
    document.addEventListener("show.bs.dropdown", handleShow);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("show.bs.dropdown", handleShow);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return null;
};

export default FilterDropdownInit;
