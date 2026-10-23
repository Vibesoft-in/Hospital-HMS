"use client";


import { useState } from "react";
import ImageWithBasePath from "@/core/imageWithBasePath";
import { all_routes } from "../../../../../routes/all_routes";
import Link from "next/link";

const VideoCallComponent = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    }
  };

  return (
    <>
  {/* ========================
			Start Page Content
		========================= */}
  <div className="page-wrapper">
    {/* Start Content */}
    <div className="content">
      {/* Page Header */}
      <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 pb-3">
        <div className="flex-grow-1">
          <h4 className="fs-18 fw-semibold mb-0">Video Call</h4>
        </div>
        <div className="text-end">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item">
              <Link href={all_routes.dashboard}>Home</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href={all_routes.dashboard}>Applications</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Video Call
            </li>
          </ol>
        </div>
      </div>
      {/* End Page Header */}
      {/* start row */}
      <div className="row">
        <div className="col-xxl-12">
          <div className="single-video d-flex">
            <div className="join-video flex-fill position-relative">
              <ImageWithBasePath
                src="assets/img/media/video.jpg"
                className="img-fluid w-100"
                alt="Logo"
              />
              <div className="chat-active-users">
                <div className="video-avatar position-absolute p-2 top-0 end-0">
                  <ImageWithBasePath
                    src="./assets/img/users/user-01.jpg"
                    className="img-fluid rounded border border-primary"
                    alt="Logo"
                  />
                  <div className="position-absolute start-0 bottom-0 w-100 text-center py-2">
                    <span className="bg-white text-dark d-inline-block fw-medium rounded p-1 my-2">
                      Joe Lewis
                    </span>
                  </div>
                </div>
              </div>
              <div className="position-absolute start-0 top-0 p-2 z-1 d-flex align-items-center">
                <div className="me-2">
                  <span className="bg-light-subtle rounded badge text-dark p-2 d-inline-flex align-items-center">
                    <i className="ti ti-circle-filled me-1" />
                    40:12
                  </span>
                </div>
                <Link
                  href="javascript:void(0);"
                  className="btn p-0 avatar-sm btn-light btnFullscreen" onClick={toggleFullscreen}
                >
                  <i className="ti ti-maximize" />
                </Link>
              </div>
              <div className="d-flex justify-content-center align-items-center flex-wrap w-100 position-absolute bottom-0 z-2 p-2">
                <div className="bg-light bg-opacity-50 px-3 py-2 rounded-pill d-flex justify-content-center align-items-center">
                  <Link
                    href="javascript:void(0);"
                    className="bg-light btn-icon btn-sm bg-light d-flex justify-content-center align-items-center rounded me-2"
                  >
                    <i className="ti ti-microphone" />
                  </Link>
                  <Link
                    href="javascript:void(0);"
                    className="bg-light btn-icon btn-sm bg-light d-flex justify-content-center align-items-center rounded me-2"
                  >
                    <i className="ti ti-video" />
                  </Link>
                  <Link
                    href="javascript:void(0);"
                    className="btn btn-icon btn-lg text-white bg-danger d-flex justify-content-center align-items-center rounded"
                  >
                    <i className="ti ti-phone" />
                  </Link>
                  <Link
                    href="javascript:void(0);"
                    className="bg-light btn-icon btn-sm bg-light d-flex justify-content-center align-items-center rounded mx-2"
                  >
                    <i className="ti ti-volume" />
                  </Link>
                  <Link
                    href="javascript:void(0);"
                    className="bg-light text-dark btn-icon btn-sm d-flex align-items-center justify-content-center rounded"
                  >
                    <i className="ti ti-user-off" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* end col */}
      </div>
      {/* end row */}
    </div>
    {/* End Content */}
    {/* Footer Start */}
    <div className="footer text-center bg-white p-2 border-top">
      <p className="text-dark mb-0">
        2025 ©{" "}
        <Link href="javascript:void(0);" className="link-primary">
          Preclinic
        </Link>
        , All Rights Reserved
      </p>
    </div>
    {/* Footer End */}
  </div>
  {/* ========================
			End Page Content
		========================= */}
</>

  );
};

export default VideoCallComponent;
