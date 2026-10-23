/** Close a Bootstrap filter dropdown by menu element id (defaults to `filter-dropdown`). */
export const closeFilterDropdown = (menuId = "filter-dropdown"): void => {
  if (typeof document === "undefined") return;

  const menu = document.getElementById(menuId);
  const dropdown = menu?.closest(".dropdown");
  if (!dropdown) return;

  const toggle = dropdown.querySelector<HTMLElement>('[data-bs-toggle="dropdown"]');
  if (!toggle) return;

  const bootstrap = (window as Window & { bootstrap?: { Dropdown?: { getInstance: (el: Element) => { hide: () => void } | null } } })
    .bootstrap;

  const instance = bootstrap?.Dropdown?.getInstance(toggle);
  if (instance) {
    instance.hide();
    return;
  }

  toggle.setAttribute("aria-expanded", "false");
  toggle.classList.remove("show");
  menu?.classList.remove("show");
};
