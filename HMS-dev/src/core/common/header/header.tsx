"use client";

import "@/core/api/axiosAuth";
import ImageWithBasePath from "../../imageWithBasePath";
import { useEffect, useState } from "react";
import { updateTheme } from "../../redux/themeSlice";
import { useDispatch, useSelector } from "react-redux";
import { setMobileSidebar } from "../../redux/sidebarSlice";
import Link from "next/link";
import { getAccessToken, silentRefresh, postHospitalLogout } from "@/core/auth/inMemoryToken";
import { all_routes } from "@/routes/all_routes";
import { usePathname, useRouter } from "next/navigation";
import DoctorAvatar from "@/components/common/DoctorAvatar";

const Header = () => {

  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const themeSettings = useSelector((state: any) => state.theme.themeSettings);
  const [isHiddenLayoutActive, setIsHiddenLayoutActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpened, setIsSidebarOpened] = useState(false);

  // Load hidden layout state from localStorage on client only
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined"
        ? window.localStorage.getItem("hiddenLayoutActive")
        : null;
      setIsHiddenLayoutActive(saved ? JSON.parse(saved) : false);
    } catch {
      // no-op if storage is unavailable
    }
  }, []);

  // Redirect to login when no auth token (user not logged in)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const publicPaths = new Set<string>([
      all_routes.login,
      all_routes.loginCover,
      all_routes.loginbasic,
      all_routes.loginillustration,
    ]);

    const isPublic =
      publicPaths.has(pathname) ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/(auth)");

    if (isPublic) {
      return;
    }

    let cancelled = false;
    (async () => {
      let token = getAccessToken();
      if (!token) {
        token = await silentRefresh();
      }
      if (cancelled) return;
      if (!token) {
        router.replace(all_routes.login);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    const htmlElement: any = document.documentElement;
    Object.entries(themeSettings).forEach(([key, value]) => {
      htmlElement.setAttribute(key, value);
    });
  }, [themeSettings]);

  const handleUpdateTheme = (key: string, value: string) => {
    if (themeSettings["dir"] === "rtl" && key !== "dir") {
      dispatch(updateTheme({ dir: "ltr" }));
    }
    dispatch(updateTheme({ [key]: value }));
  };

  const mobileSidebar = useSelector(
    (state: any) => state.sidebarSlice.mobileSidebar
  );

  const toggleMobileSidebar = () => {
    const body = document.body;
    const isOpened = !body.classList.contains("slide-nav");
    body.classList.toggle("slide-nav");
    setIsSidebarOpened(isOpened);
  };

  const handleToggleHiddenLayout = () => {
    // Only apply this functionality when layout is "hidden"
    if (themeSettings["data-layout"] === "hidden") {
      const newState = !isHiddenLayoutActive;
      setIsHiddenLayoutActive(newState);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("hiddenLayoutActive", JSON.stringify(newState));
      }
    }
  };

  // Sync body class with hidden layout state
  useEffect(() => {
    const bodyElement = document.body;
    if (themeSettings["data-layout"] === "hidden") {
      if (isHiddenLayoutActive) {
        bodyElement.classList.add("hidden-layout");
      } else {
        bodyElement.classList.remove("hidden-layout");
      }
    } else {
      bodyElement.classList.remove("hidden-layout");
      setIsHiddenLayoutActive(false);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("hiddenLayoutActive");
      }
    }
  }, [isHiddenLayoutActive, themeSettings["data-layout"]]);

  return (
    <>
      {/* Topbar Start */}
      <header className="navbar-header">
        <div className="page-container topbar-menu">
          <div className="d-flex align-items-center gap-2">
            {/* Logo */}
            <Link href={all_routes.dashboard} className="logo">
              {/* Logo Normal */}
              <span className="logo-light">
                <span className="logo-lg">
                  <ImageWithBasePath src="assets/img/logo.svg" alt="logo" />
                </span>
                <span className="logo-sm">
                  <ImageWithBasePath
                    src="assets/img/logo-small.svg"
                    alt="small logo"
                  />
                </span>
              </span>
              {/* Logo Dark */}
              <span className="logo-dark">
                <span className="logo-lg">
                  <ImageWithBasePath
                    src="assets/img/logo-white.svg"
                    alt="dark logo"
                  />
                </span>
              </span>
            </Link>
            {/* Sidebar Mobile Button */}
            <Link
              id="mobile_btn"
              className="mobile-btn"
              href="#"
              onClick={toggleMobileSidebar}
            >
              <i className="ti ti-menu-deep fs-24" />
            </Link>
            <button
              className="sidenav-toggle-btn btn border-0 p-0 active"
              id="toggle_btn2"
              onClick={handleToggleHiddenLayout}
            >
              <i className="ti ti-arrow-right" />
            </button>
            {/* Search */}
            <div className="me-auto d-flex align-items-center header-search d-lg-flex d-none">
              {/* Search */}
              {/* <div className="input-icon-start position-relative me-2">
                <span className="input-icon-addon">
                  <i className="ti ti-search" />
                </span>
                <input
                  type="text"
                  className="form-control shadow-sm"
                  placeholder="Search"
                />
                <span className="input-icon-addon text-dark shadow fs-18 d-inline-flex p-0 header-search-icon">
                  <i className="ti ti-command" />
                </span>
              </div> */}
              {/* /Search */}
            </div>
          </div>
          <div className="d-flex align-items-center">
            {/* Search for Mobile */}
            {/* <div className="header-item d-flex d-lg-none me-2">
              <button
                className="topbar-link btn btn-icon"
                data-bs-toggle="modal"
                data-bs-target="#searchModal"
                type="button"
              >
                <i className="ti ti-search fs-16" />
              </button>
            </div> */}
            {/* AI Assistance */}
            {/* <Link
              href="#"
              className="btn btn-liner-gradient me-3 d-lg-flex d-none"
            >
              AI Assistance
              <i className="ti ti-chart-bubble-filled ms-1" />
            </Link> */}
            {/* AI Assistance */}
            {/* Appointment */}
            {/* <div className="header-item">
              <div className="dropdown me-2">
                <Link href={all_routes.newAppointment} className="btn topbar-link">
                  <i className="ti ti-calendar-due" />
                </Link>
              </div>
            </div> */}
            {/* Appointment */}
            {/* Settings */}
            {/* <div className="header-item">
              <div className="dropdown me-2">
                <Link href={all_routes.profilesettings} className="btn topbar-link">
                  <i className="ti ti-settings-2" />
                </Link>
              </div>
            </div> */}
            {/* Settings */}
            {/* Light/Dark Mode Button */}
            {isMounted && (
              <div className="header-item d-none d-sm-flex me-2">
                <Link
                  href="#"
                  id="dark-mode-toggle"
                  className={`topbar-link btn btn-icon topbar-link header-togglebtn ${
                    themeSettings["data-bs-theme"] === "dark" ? "activate" : ""
                  }`}
                  onClick={() => handleUpdateTheme("data-bs-theme", "light")}
                >
                  <i className="ti ti-sun fs-16" />
                </Link>
                {/* Light Mode Toggle */}
                <Link
                  href="#"
                  id="light-mode-toggle"
                  className={`topbar-link btn btn-icon topbar-link header-togglebtn ${
                    themeSettings["data-bs-theme"] === "light" ? "activate" : ""
                  }`}
                  onClick={() => handleUpdateTheme("data-bs-theme", "dark")}
                >
                  <i className="ti ti-moon fs-16" />
                </Link>
              </div>
            )}
            {/* Notification Dropdown */}
            {/* <div className="header-item">
              <div className="dropdown me-3">
                <button
                  className="topbar-link btn btn-icon topbar-link dropdown-toggle drop-arrow-none"
                  data-bs-toggle="dropdown"
                  data-bs-offset="0,24"
                  type="button"
                  aria-haspopup="false"
                  aria-expanded="false"
                >
                  <i className="ti ti-bell-check fs-16 animate-ring" />
                  <span className="notification-badge" />
                </button>
                <div
                  className="dropdown-menu p-0 dropdown-menu-end dropdown-menu-lg"
                  style={{ minHeight: 300 }}
                >
                  <div className="p-2 border-bottom">
                    <div className="row align-items-center">
                      <div className="col">
                        <h6 className="m-0 fs-16 fw-semibold">
                          
                          Notifications
                        </h6>
                      </div>
                    </div>
                  </div>
                 
                  <div
                    className="notification-body position-relative z-2 rounded-0"
                    data-simplebar=""
                  >
        
                    <div
                      className="dropdown-item notification-item py-3 text-wrap border-bottom"
                      id="notification-1"
                    >
                      <div className="d-flex">
                        <div className="me-2 position-relative flex-shrink-0">
                          <DoctorAvatar
                            gender="Male"
                            size={40}
                            className="rounded-circle"
                          />
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-0 fw-medium text-dark">Dr. Smith</p>
                          <p className="mb-1 text-wrap">
                            updated the
                            <span className="fw-medium text-dark">surgery</span>
                            schedule.
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fs-12">
                              <i className="ti ti-clock me-1" />4 min ago
                            </span>
                            <div className="notification-action d-flex align-items-center float-end gap-2">
                              <Link
                                href="#"
                                className="notification-read rounded-circle bg-danger"
                                data-bs-toggle="tooltip"
                                title=""
                                data-bs-original-title="Make as Read"
                                aria-label="Make as Read"
                              />
                              <button
                                className="btn rounded-circle p-0"
                                data-dismissible="#notification-1"
                              >
                                <i className="ti ti-x" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                   
                    <div
                      className="dropdown-item notification-item py-3 text-wrap border-bottom"
                      id="notification-2"
                    >
                      <div className="d-flex">
                        <div className="me-2 position-relative flex-shrink-0">
                          <DoctorAvatar
                            gender="Female"
                            size={40}
                            className="rounded-circle"
                          />
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-0 fw-medium text-dark">Dr. Patel</p>
                          <p className="mb-1 text-wrap">
                            completed a
                            <span className="fw-medium text-dark">
                              follow-up
                            </span>
                            report for patient
                            <span className="fw-medium text-dark">Emily</span>.
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fs-12">
                              <i className="ti ti-clock me-1" />8 min ago
                            </span>
                            <div className="notification-action d-flex align-items-center float-end gap-2">
                              <Link
                                href="#"
                                className="notification-read rounded-circle bg-danger"
                                data-bs-toggle="tooltip"
                                title=""
                                data-bs-original-title="Make as Read"
                                aria-label="Make as Read"
                              />
                              <button
                                className="btn rounded-circle p-0"
                                data-dismissible="#notification-2"
                              >
                                <i className="ti ti-x" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div
                      className="dropdown-item notification-item py-3 text-wrap border-bottom"
                      id="notification-3"
                    >
                      <div className="d-flex">
                        <div className="me-2 position-relative flex-shrink-0">
                          <DoctorAvatar
                            gender="Female"
                            size={40}
                            className="rounded-circle"
                          />
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-0 fw-medium text-dark">Emily</p>
                          <p className="mb-1 text-wrap">
                            booked an appointment with
                            <span className="fw-medium text-dark">
                              Dr. Patel
                            </span>
                            for
                            <span className="fw-medium text-dark">
                              April 15
                            </span>
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fs-12">
                              <i className="ti ti-clock me-1" />
                              15 min ago
                            </span>
                            <div className="notification-action d-flex align-items-center float-end gap-2">
                              <Link
                                href="#"
                                className="notification-read rounded-circle bg-danger"
                                data-bs-toggle="tooltip"
                                title=""
                                data-bs-original-title="Make as Read"
                                aria-label="Make as Read"
                              />
                              <button
                                className="btn rounded-circle p-0"
                                data-dismissible="#notification-3"
                              >
                                <i className="ti ti-x" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div
                      className="dropdown-item notification-item py-3 text-wrap"
                      id="notification-4"
                    >
                      <div className="d-flex">
                        <div className="me-2 position-relative flex-shrink-0">
                          <DoctorAvatar
                            gender="Female"
                            size={40}
                            className="rounded-circle"
                          />
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-0 fw-medium text-dark">Amelia</p>
                          <p className="mb-1 text-wrap">
                            completed the
                            <span className="fw-medium text-dark">
                              pre-visit
                            </span>
                            health questionnaire.
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fs-12">
                              <i className="ti ti-clock me-1" />
                              20 min ago
                            </span>
                            <div className="notification-action d-flex align-items-center float-end gap-2">
                              <Link
                                href="#"
                                className="notification-read rounded-circle bg-danger"
                                data-bs-toggle="tooltip"
                                title=""
                                data-bs-original-title="Make as Read"
                                aria-label="Make as Read"
                              />
                              <button
                                className="btn rounded-circle p-0"
                                data-dismissible="#notification-4"
                              >
                                <i className="ti ti-x" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2 rounded-bottom border-top text-center">
                    <Link
                      href={all_routes.notifications}
                      className="text-center text-decoration-underline fs-14 mb-0"
                    >
                      View All Notifications
                    </Link>
                  </div>
                </div>
              </div>
            </div> */}
            {/* User Dropdown */}
            <div className="dropdown profile-dropdown d-flex align-items-center justify-content-center">
              <Link
                href="#"
                className="topbar-link dropdown-toggle drop-arrow-none position-relative"
                data-bs-toggle="dropdown"
                data-bs-offset="0,22"
                aria-haspopup="false"
                aria-expanded="false"
              >
                <ImageWithBasePath
                  src="assets/img/users/user-01.jpg"
                  width={32}
                  className="rounded-circle d-flex"
                  alt="user-image"
                />
                <span className="online text-success">
                  <i className="ti ti-circle-filled d-flex bg-white rounded-circle border border-1 border-white" />
                </span>
              </Link>
              <div className="dropdown-menu dropdown-menu-end dropdown-menu-md p-2">
                <div className="d-flex align-items-center bg-light rounded-3 p-2 mb-2">
                  <ImageWithBasePath
                    src="assets/img/users/user-01.jpg"
                    className="rounded-circle"
                    width={42}
                    height={42}
                    alt=""
                  />
                  <div className="ms-2">
                    <p className="fw-medium text-dark mb-0">Jimmy Anderson</p>
                    <span className="d-block fs-13">Administrator</span>
                  </div>
                </div>
                {/* Item*/}
                <Link href={all_routes.profilesettings} className="dropdown-item">
                  <i className="ti ti-user-circle me-1 align-middle" />
                  <span className="align-middle">Profile Settings</span>
                </Link>
                {/* Item*/}
                <Link href={all_routes.profilesettings} className="dropdown-item">
                  <i className="ti ti-settings me-1 align-middle" />
                  <span className="align-middle">Account Settings</span>
                </Link>
                {/* item */}
                <div className="form-check form-switch form-check-reverse d-flex align-items-center justify-content-between dropdown-item mb-0">
                  <label className="form-check-label" htmlFor="notify">
                    <i className="ti ti-bell me-1" />
                    Notifications
                  </label>
                  <input
                    className="form-check-input me-0"
                    type="checkbox"
                    role="switch"
                    id="notify"
                  />
                </div>
                {/* Item*/}
                <Link href={all_routes.transactions} className="dropdown-item">
                  <i className="ti ti-transition-right me-1 align-middle" />
                  <span className="align-middle">Transactions</span>
                </Link>
                {/* Item*/}
                <div className="pt-2 mt-2 border-top">
                  <Link
                    href={all_routes.login}
                    className="dropdown-item text-danger"
                    onClick={async (e) => {
                      e.preventDefault();
                      await postHospitalLogout();
                      router.replace(all_routes.login);
                    }}
                  >
                    <i className="ti ti-logout me-1 fs-17 align-middle" />
                    <span className="align-middle">Log Out</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* Topbar End */}
      {/* Search Modal */}
      <div className="modal fade" id="searchModal">
        <div className="modal-dialog modal-lg">
          <div className="modal-content bg-transparent">
            <div className="card shadow-none mb-0">
              <div
                className="px-3 py-2 d-flex flex-row align-items-center"
                id="search-top"
              >
                <i className="ti ti-search fs-22" />
                <input
                  type="search"
                  className="form-control border-0"
                  placeholder="Search"
                />
                <button
                  type="button"
                  className="btn p-0"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i className="ti ti-x fs-22" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    <div className={`sidebar-overlay${isSidebarOpened ? " opened" : ""}`}></div>
    </>
  );
};

export default Header;
