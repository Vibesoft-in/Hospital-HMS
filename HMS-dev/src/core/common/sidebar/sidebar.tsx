"use client";

import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { SidebarData } from "./sidebarData";
import { useDispatch, useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { all_routes } from "@/routes/all_routes";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";
import { setExpandMenu, setMobileSidebar } from "@/core/redux/sidebarSlice";
// import Image from "next/image";
import ImageWithBasePath from "@/core/imageWithBasePath";
import { updateTheme } from "@/core/redux/themeSlice";
import {
  canShowNewAppointmentSidebarCta,
  filterSidebarSubmenuItems,
  isAdminRole,
  normalizeRole,
} from "@/core/auth/roleAccess";
import { isSharedAuthEnabled, postSharedLogout } from "@/core/auth/sharedAuth";
import { clearLocalAuthSession } from "@/core/auth/sessionCookie";
import PranaOSBrand from "@/core/common/pranaos-brand/PranaOSBrand";
import ChangePasswordModal from "@/core/common/ChangePasswordModal";

const Sidebar = () => {
  const Location = usePathname();
  const [subOpen, setSubopen] = useState<any>("");
  const [subsidebar, setSubsidebar] = useState("");
  const [isSidebarOpened, setIsSidebarOpened] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [sidebarUserName, setSidebarUserName] = useState("Unknown User");
  const [sidebarUserRole, setSidebarUserRole] = useState("Unknown Role");
  const [sidebarUserInitials, setSidebarUserInitials] = useState("JA");
  const [sidebarUserRoleRaw, setSidebarUserRoleRaw] = useState<string | null>(null);
  const dispatch = useDispatch();

  const toggleSidebar = (title: any) => {
    localStorage.setItem("menuOpened", title);
    if (title === subOpen) {
      setSubopen("");
    } else {
      setSubopen(title);
    }
  };

  const toggleSubsidebar = (subitem: any) => {
    if (subitem === subsidebar) {
      setSubsidebar("");
    } else {
      setSubsidebar(subitem);
    }
  };

  const handleClick = (label: any) => {
    toggleSidebar(label);
  };

  const navigate = useRouter();
  const themeSettings = useSelector((state: any) => state.theme.themeSettings);

  const handleMiniSidebar = () => {
    const rootElement = document.documentElement;
    const isMini = rootElement.getAttribute("data-layout") === "mini";
    const updatedLayout = isMini ? "default" : "mini";
    dispatch(
      updateTheme({
        "data-layout": updatedLayout,
      })
    );
    if (isMini) {
      document.body.classList.remove("mini-sidebar");
    } else {
      document.body.classList.add("mini-sidebar");
    }
  };
    // Handle mouse enter for mini sidebar
  const handleMouseEnter = useCallback(() => {
    const body = document.body;
    if (body.classList.contains('mini-sidebar')) {
      body.classList.add('expand-menu');
    }
    dispatch(setExpandMenu(true));
  }, [dispatch]);

  // Handle mouse leave for mini sidebar
  const handleMouseLeave = useCallback(() => {
    const body = document.body;
    if (body.classList.contains('mini-sidebar')) {
      body.classList.remove('expand-menu');
    }
    dispatch(setExpandMenu(false));
  }, [dispatch]);


  const handleLayoutClick = (layout: string) => {
    const layoutSettings: any = {
      "data-layout": "default",
      dir: "ltr",
    };

    switch (layout) {
      case "Default":
        layoutSettings["data-layout"] = "default";
        layoutSettings.dir = "ltr";
        break;
      case "Hidden":
        layoutSettings["data-layout"] = "hidden";
        break;
      case "Mini":
        layoutSettings["data-layout"] = "mini";
        break;
      case "Hover View":
        layoutSettings["data-layout"] = "hoverview";
        break;
      case "Full Width":
        layoutSettings["data-layout"] = "full-width";
        break;
      case "RTL":
        layoutSettings.dir = "rtl";
        break;
      default:
        layoutSettings.dir = "ltr";
        break;
    }
    dispatch(updateTheme(layoutSettings));
    navigate.push("/dashboard");
  };
  const mobileSidebar = useSelector(
    (state: any) => state.sidebarSlice.mobileSidebar
  );
   const toggleMobileSidebar = () => {
      const body = document.body;
      body.classList.remove("slide-nav");
      setIsSidebarOpened(false);
      // Remove 'opened' class from sidebar-overlay if present
      const overlay = document.querySelector('.sidebar-overlay');
      if (overlay) {
        overlay.classList.remove('opened');
      }
    };
  useEffect(() => {
    const rootElement: any = document.documentElement;
    Object.entries(themeSettings).forEach(([key, value]) => {
      rootElement.setAttribute(key, value);
    });
    if (themeSettings["data-layout"] === "mini") {
      document.body.classList.add("mini-sidebar");
    } 
    else if (Location === "/layout-rtl") {
      rootElement.setAttribute("dir","rtl");      
    } else {
      document.body.classList.remove("mini-sidebar");
      rootElement.setAttribute("dir","ltr");      
    }

    // Keep browser tab title consistent with sidebar brand visibility (mini vs normal)
    try {
      const isMini = themeSettings?.["data-layout"] === "mini";
      document.title = isMini ? "JJM" : "JJM Hospital";
    } catch {
      // ignore
    }
  }, [themeSettings,Location]);

  // Load logged-in user info from localStorage (set on login); layout before paint to avoid menu flash
  useLayoutEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("authUser") : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as { name?: string; username?: string; role?: string } | null;
      if (!parsed) return;
      const name = (parsed.name || parsed.username || "").trim();
      const role = (parsed.role || "").trim();
      if (name) {
        setSidebarUserName(name);
        const parts = name.split(" ").filter(Boolean);
        const initials =
          (parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] || "" : "");
        setSidebarUserInitials(initials.toUpperCase() || "U");
      }
      if (role) {
        setSidebarUserRoleRaw(role);
        setSidebarUserRole(role.charAt(0) + role.slice(1).toLowerCase());
      } else {
        setSidebarUserRoleRaw(null);
      }
    } catch {
      // ignore parse/storage errors
    }
  }, []);

  

  return (
    <>
      {/* Sidenav Menu Start */}
      <div
        className="sidebar"
        id="sidebar"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Start Logo - PranaOS + collapse button in same row */}
        <div className="sidebar-logo d-flex align-items-center justify-content-between gap-2">
          {/* <span className="avatar rounded flex-shrink-0 p-1 overflow-hidden bg-white d-flex align-items-center justify-content-center" style={{ width: 52, height: 52 }}>
            <Image src="/JJM Logo.png" alt="JJM Hospital" width={48} height={48} style={{ objectFit: "contain" }} />
          </span> */}
          <div className="logo logo-normal min-w-0 flex-grow-1">
            <PranaOSBrand />
          </div>
          <div className="logo-small">
            <PranaOSBrand compact />
          </div>
         
          <button
            className="sidenav-toggle-btn btn border-0 p-0 active flex-shrink-0"
            id="toggle_btn"
            onClick={handleMiniSidebar}
          >
            <i className="ti ti-arrow-left" />
          </button>
          {/* Sidebar Menu Close */}
          <button className="sidebar-close" onClick={toggleMobileSidebar}>
            <i className="ti ti-x align-middle" />
          </button>
        </div>
        {/* End Logo */}
        {/* Sidenav Menu */}
        <div className="sidebar-inner">
          <OverlayScrollbarsComponent style={{ height: "100%", width: "100%" }}>
            <div id="sidebar-menu" className="sidebar-menu sidebar-menu-content">
              {canShowNewAppointmentSidebarCta(sidebarUserRoleRaw ?? "") && (
                <div className="mb-3 px-2 sidebar-new-appointment-wrap">
                  <Link
                    href={all_routes.newAppointment}
                    className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center sidebar-new-appointment-btn"
                  >
                    <i className="ti ti-plus" />
                    <span className="sidebar-btn-text ms-1">New Appointment</span>
                  </Link>
                </div>
              )}
              <ul>
                {SidebarData?.map((mainLabel, index) => {
                  const isAdministrationSection = mainLabel?.tittle === "Administration";
                  const role = normalizeRole(sidebarUserRoleRaw);
                  const canViewAdministrationSection =
                    isAdminRole(role) || role === "ACCOUNTANT";
                  if (isAdministrationSection && !canViewAdministrationSection) {
                    return null;
                  }
                  const filteredSubmenuItems = filterSidebarSubmenuItems(
                    sidebarUserRoleRaw ?? "",
                    mainLabel?.submenuItems
                  );
                  if (!filteredSubmenuItems.length) {
                    return null;
                  }
                  const filteredMainLabel = {
                    ...mainLabel,
                    submenuItems: filteredSubmenuItems,
                  };
                  return (
                  <React.Fragment key={`main-${index}`}>
                    <li className="menu-title">
                      <span>{mainLabel?.tittle}</span>
                    </li>
                    <li>
                      <ul>
                        {filteredMainLabel?.submenuItems?.map((title: any, i) => {
                          let link_array: any = [];
                          if ("submenuItems" in title) {
                            title.submenuItems?.forEach((link: any) => {
                              link_array.push(link?.link);
                              if (link?.submenu && "submenuItems" in link) {
                                link.submenuItems?.forEach((item: any) => {
                                  link_array.push(item?.link);
                                });
                              }
                            });
                          }
                          title.links = link_array;

                          const isExternalMain =
                            !title?.submenu &&
                            typeof title?.link === "string" &&
                            title.link.startsWith("http");

                          return (
                            <li className="submenu" key={`title-${i}`}>
                              <Link
                                href={title?.submenu ? "#" : title?.link}
                                onClick={(e) => {
                                  if (title?.submenu) {
                                    e.preventDefault();
                                  }
                                  handleClick(title?.label);

                                  if (mainLabel?.tittle === "Layout") {
                                    handleLayoutClick(title?.label);
                                  }
                                }}
                                target={isExternalMain ? "_blank" : undefined}
                                rel={isExternalMain ? "noopener noreferrer" : undefined}
                                className={`${
                                  subOpen === title?.label
                                    ? "subdrop"
                                    : ""
                                } ${
                                  title?.links?.includes(Location) ||
                                  title?.link === Location
                                    ? "active"
                                    : ""
                                }`}
                              >
                                <i className={`ti ti-${title.icon}`}></i>
                                <span>{title?.label}</span>
                                {(title?.submenu || title?.customSubmenuTwo) && (
                                  <span className="menu-arrow"></span>
                                )}
                                {title?.submenu === false &&
                                  title?.version === "v1.6.7" && (
                                    <span className="badge bg-danger ms-2 rounded-2 badge-md fs-12 fw-medium">
                                      v1.6.7
                                    </span>
                                  )}
                              </Link>

                              {title?.submenu !== false && (
                                <ul
                                  style={{
                                    display:
                                      subOpen === title?.label
                                        ? "block"
                                        : "none",
                                  }}
                                >
                                  {title?.submenuItems?.map(
                                    (item: any, j: any) => {
                                      const isSubActive =
                                        item?.submenuItems
                                          ?.map((link: any) => link?.link)
                                          .includes(Location) ||
                                        item?.link === Location;

                                      return (
                                        <li
                                          className={`${
                                            item?.submenuItems
                                              ? "submenu submenu-two"
                                              : ""
                                          } `}
                                          key={`item-${j}`}
                                        >
                                          <Link
                                            href={item?.submenu ? "#" : item?.link}
                                            className={`${
                                              isSubActive ? "active subdrop" : ""
                                            } ${
                                              subsidebar === item?.label
                                                ? "subdrop"
                                                : ""
                                            }`}
                                            onClick={() => {
                                              toggleSubsidebar(item?.label);
                                              if (title?.label === "Layouts") {
                                                handleLayoutClick(item?.label);
                                              }
                                            }}


                                          >
                                            {item?.label}
                                            {(item?.submenu ||
                                              item?.customSubmenuTwo) && (
                                              <span className="menu-arrow"></span>
                                            )}
                                          </Link>
                                          {item?.submenuItems ? (
                                            <ul
                                              style={{
                                                display:
                                                  subsidebar === item?.label
                                                    ? "block"
                                                    : "none",
                                              }}
                                            >
                                              {item?.submenuItems?.map(
                                                (items: any, k: any) => {
                                                  const isSubSubActive =
                                                    items?.submenuItems
                                                      ?.map(
                                                        (link: any) => link.link
                                                      )
                                                      .includes(
                                                        Location
                                                      ) ||
                                                    items?.link ===
                                                      Location;

                                                  return (
                                                    <li key={`submenu-item-${k}`}>
                                                      <Link
                                                        href={
                                                          items?.submenu
                                                            ? "#"
                                                            : items?.link
                                                        }
                                                        className={`${
                                                          isSubSubActive
                                                            ? "active"
                                                            : ""
                                                        }`}
                                                      >
                                                        {items?.label}
                                                      </Link>
                                                    </li>
                                                  );
                                                }
                                              )}
                                            </ul>
                                          ) : null}
                                        </li>
                                      );
                                    }
                                  )}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  </React.Fragment>
                  );
                })}
              </ul>
            </div>
          </OverlayScrollbarsComponent>
          <div className="sidebar-footer sidebar-profile-block">
            <div className="d-flex align-items-center justify-content-between gap-2 p-2 rounded-2 bg-light">
              <div className="d-flex align-items-center gap-2 min-w-0 flex-grow-1">
                <span className="avatar rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center bg-primary text-white fs-14 fw-semibold sidebar-profile-avatar" style={{ width: 36, height: 36 }}>
                  {sidebarUserInitials}
                </span>
                <div className="min-w-0 flex-grow-1 sidebar-profile-text">
                  <p className="fs-13 fw-semibold text-dark mb-0 text-truncate">{sidebarUserName}</p>
                  <p className="fs-12 text-muted mb-0 text-truncate">{sidebarUserRole}</p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-inline-flex align-items-center justify-content-center"
                  title="Change Password"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <i className="ti ti-key fs-16" />
                </button>
                <Link
                  href={all_routes.login}
                  className="btn btn-sm btn-outline-danger d-inline-flex align-items-center justify-content-center"
                  title="Log Out"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (isSharedAuthEnabled()) {
                      await postSharedLogout();
                    }
                    clearLocalAuthSession();
                    navigate.replace(all_routes.login);
                  }}
                >
                  <i className="ti ti-logout fs-16" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Sidenav Menu End */}

      <div className={`sidebar-overlay${isSidebarOpened ? " opened" : ""}`}></div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        defaultTab={isAdminRole(normalizeRole(sidebarUserRoleRaw)) ? "dashboard" : "account"}
      />
    </>
  );
};

export default Sidebar;
