import { useState, useEffect, useCallback } from "react";
import ImageWithBasePath from "../../imageWithBasePath";
import { useDispatch, useSelector } from "react-redux";
import { updateTheme } from "../../redux/themeSlice";
import { setExpandMenu, setMobileSidebar } from "../../redux/sidebarSlice";
import { all_routes } from "@/routes/all_routes";
import { usePathname } from "next/navigation";
import Link from "next/link";

const Sidebarthree = () => {
  const location = usePathname();
  const routes = all_routes;

  // State for open submenus
  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>({
    settings: false,
  });

  // Open settings submenu if on a settings route
  useEffect(() => {
    const isSettingsRoute = [
      routes.patientprofilesettings,
      routes.patientpasswordsettings,
      routes.patientnotificationssettings,
    ].includes(location);
    setOpenSubmenus((prev) => ({
      ...prev,
      settings: isSettingsRoute ? true : prev.settings,
    }));
  }, [location, routes]);

  const isActive = (path: string) => location === path;

  const handleToggle = (menu: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  const dispatch = useDispatch();

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
      rootElement.classList.remove("mini-sidebar");
    } else {
      rootElement.classList.add("mini-sidebar");
    }
  };

  // const onMouseEnter = () => {
  //   dispatch(setExpandMenu(true));
  // };
  // const onMouseLeave = () => {
  //   dispatch(setExpandMenu(false));
  // };

  const handleMouseEnter = useCallback(() => {
    const body = document.body;
    if (body.classList.contains("mini-sidebar")) {
      body.classList.add("expand-menu");
    }
    dispatch(setExpandMenu(true));
  }, [dispatch]);

  // Handle mouse leave for mini sidebar
  const handleMouseLeave = useCallback(() => {
    const body = document.body;
    if (body.classList.contains("mini-sidebar")) {
      body.classList.remove("expand-menu");
    }
    dispatch(setExpandMenu(false));
  }, [dispatch]);

  const mobileSidebar = useSelector(
    (state: any) => state.sidebarSlice.mobileSidebar
  );
  const toggleMobileSidebar = () => {
    dispatch(setMobileSidebar(!mobileSidebar));
  };

  return (
    <>
      {/* Sidenav Menu Start */}
      <div
        className="sidebar doctor-sidebar"
        id="sidebar"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Start Logo */}
        <div className="sidebar-logo">
          <div>
            {/* Logo Normal */}
            <Link href={routes.dashboard} className="logo logo-normal">
              <ImageWithBasePath src="assets/img/logo.svg" alt="Logo" />
            </Link>
            {/* Logo Small */}
            <Link href={routes.dashboard} className="logo-small">
              <ImageWithBasePath src="assets/img/logo-small.svg" alt="Logo" />
            </Link>
            {/* Logo Dark */}
            <Link href={routes.dashboard} className="dark-logo">
              <ImageWithBasePath src="assets/img/logo-white.svg" alt="Logo" />
            </Link>
          </div>
          <button
            className="sidenav-toggle-btn btn border-0 p-0 active"
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
        <div className="sidebar-inner" data-simplebar="">
          <div id="sidebar-menu" className="sidebar-menu">
            <ul>
              <li className="menu-title">
                <span>Main Menu</span>
              </li>
              <li>
                <ul>
                  <li
                    className={
                      isActive(routes.patientdashboard) ? "active" : ""
                    }
                  >
                    <Link href={routes.patientdashboard}>
                      <i className="ti ti-layout-dashboard" />
                      <span>Dashboard</span>
                    </Link>
                  </li>
                  <li
                    className={
                      isActive(routes.patientappointments) ||
                      isActive(routes.patientappointmentdetails)
                        ? "active"
                        : ""
                    }
                  >
                    <Link href={routes.patientappointments}>
                      <i className="ti ti-calendar-check" />
                      <span>Appointments</span>
                    </Link>
                  </li>
                  <li
                    className={isActive(routes.patientdoctors) ? "active" : ""}
                  >
                    <Link href={routes.patientdoctors}>
                      <i className="ti ti-stethoscope" />
                      <span>Doctors</span>
                    </Link>
                  </li>
                  <li
                    className={
                      isActive(routes.patientPrescriptions) ||
                      isActive(routes.patientprescriptiondetails)
                        ? "active"
                        : ""
                    }
                  >
                    <Link href={routes.patientPrescriptions}>
                      <i className="ti ti-prescription" />
                      <span>Prescriptions</span>
                    </Link>
                  </li>
                  <li
                    className={
                      isActive(routes.patientinvoices) ||
                      isActive(routes.patientinvoicedetails)
                        ? "active"
                        : ""
                    }
                  >
                    <Link href={routes.patientinvoices}>
                      <i className="ti ti-star" />
                      <span>Invoice</span>
                    </Link>
                  </li>
                  <li
                    className={`submenu${
                      openSubmenus.settings ? " active" : ""
                    }`}
                  >
                    <Link
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggle("settings");
                      }}
                    >
                      <i className="ti ti-settings" />
                      <span>Settings</span>
                      <span className="menu-arrow">
                        <i
                          className={
                            openSubmenus.settings
                              ? "ti ti-chevron-down"
                              : "ti ti-chevron-right"
                          }
                        />
                      </span>
                    </Link>
                    <ul
                      style={{
                        display: openSubmenus.settings ? "block" : "none",
                      }}
                    >
                      <li>
                        <Link
                          href={routes.patientprofilesettings}
                          className={
                            isActive(routes.patientprofilesettings)
                              ? "active"
                              : ""
                          }
                        >
                          Profile Settings
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={routes.patientpasswordsettings}
                          className={
                            isActive(routes.patientpasswordsettings)
                              ? "active"
                              : ""
                          }
                        >
                          Change Password
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={routes.patientnotificationssettings}
                          className={
                            isActive(routes.patientnotificationssettings)
                              ? "active"
                              : ""
                          }
                        >
                          Notifications
                        </Link>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
          <div className="sidebar-footer border-top mt-3">
            <div className="trial-item mt-0 p-3 text-center">
              <div className="trial-item-icon rounded-4 mb-3 p-2 text-center shadow-sm d-inline-flex">
                <ImageWithBasePath
                  src="./assets/img/icons/sidebar-icon.svg"
                  alt="img"
                />
              </div>
              <div>
                <h6 className="fs-14 fw-semibold mb-1">Upgrade To Pro</h6>
                <p className="fs-13 mb-0">
                  Check 1 min video and begin use Preclinic like a pro
                </p>
              </div>
              <Link href="#" className="close-icon shadow-sm">
                <i className="ti ti-x" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Sidenav Menu End */}
    </>
  );
};

export default Sidebarthree;
