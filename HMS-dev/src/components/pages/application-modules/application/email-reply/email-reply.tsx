"use client";

import ImageWithBasePath from "@/core/imageWithBasePath";
import { all_routes } from "@/routes/all_routes";
import Link from "next/link";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";
import { useState } from "react";

const EmailReplyComponent = () => {
  const [showMore, setShowMore] = useState(false);
  const [showMore2, setShowMore2] = useState(false);
  const [showMore3, setShowMore3] = useState(false);
  const [show, setShow] = useState<boolean>(false);

  const handleToggle = () => {
    setShowMore((prev) => !prev);
  };
  const handleToggle2 = () => {
    setShowMore2((prev) => !prev);
  };
  const handleToggle3 = () => {
    setShowMore3((prev) => !prev);
  };
  return (
    <>
      {/* ========================
			Start Page Content
		========================= */}
      <div className="page-wrapper">
        {/* Start Content */}
        <div className="content p-0">
          <div className="d-md-flex">
            {/* Email Sidenav Start */}
            <OverlayScrollbarsComponent
              className="email-sidebar border-end border-bottom bg-white w-100"
              style={{ height: "100%" }}
              data-simplebar=""
            >
              <div className="p-3">
                <div className="border bg-white rounded p-2 mb-3">
                  <div className="d-flex align-items-center">
                    <Link
                      href="#"
                      className="avatar avatar-md flex-shrink-0 me-2"
                    >
                      <ImageWithBasePath
                        src="assets/img/profiles/avatar-02.jpg"
                        className="rounded-circle"
                        alt="Img"
                      />
                    </Link>
                    <div>
                      <h6 className="mb-1 fs-16 fw-medium">
                        <Link href="#">James Hong</Link>
                      </h6>
                      <p className="fs-14 mb-0">james@example.com</p>
                    </div>
                  </div>
                </div>
                <Link
                  href="#"
                  className="btn btn-primary w-100"
                  id="compose_mail"
                  onClick={() => setShow(true)}
                >
                  <i className="ti ti-edit me-2" />
                  Compose
                </Link>
                <div className="mt-4">
                  <h5 className="mb-2">Emails</h5>
                  <div className="d-block mb-3 pb-3 border-bottom">
                    <Link
                      href={all_routes.email}
                      className="d-flex bg-light align-items-center justify-content-between p-2 rounded active"
                    >
                      <span className="d-flex align-items-center fw-medium">
                        <i className="ti ti-inbox text-gray me-2" />
                        Inbox
                      </span>
                      <span className="badge bg-danger bg-danger rounded-pill badge-xs">
                        56
                      </span>
                    </Link>
                    <Link
                      href="#"
                      className="d-flex align-items-center justify-content-between p-2 rounded"
                    >
                      <span className="d-flex align-items-center fw-medium">
                        <i className="ti ti-star text-gray me-2" />
                        Starred
                      </span>
                      <span className="fw-semibold fs-12 rounded-pill">46</span>
                    </Link>
                    <Link
                      href="#"
                      className="d-flex align-items-center justify-content-between p-2 rounded"
                    >
                      <span className="d-flex align-items-center fw-medium">
                        <i className="ti ti-rocket text-gray me-2" />
                        Sent
                      </span>
                      <span className="rounded-pill">14</span>
                    </Link>
                    <Link
                      href="#"
                      className="d-flex align-items-center justify-content-between p-2 rounded"
                    >
                      <span className="d-flex align-items-center fw-medium">
                        <i className="ti ti-file text-gray me-2" />
                        Drafts
                      </span>
                      <span className="rounded-pill">12</span>
                    </Link>
                    <Link
                      href="#"
                      className="d-flex align-items-center justify-content-between p-2 rounded"
                    >
                      <span className="d-flex align-items-center fw-medium">
                        <i className="ti ti-trash text-gray me-2" />
                        Deleted
                      </span>
                      <span className="rounded-pill">08</span>
                    </Link>
                    <Link
                      href="#"
                      className="d-flex align-items-center justify-content-between p-2 rounded"
                    >
                      <span className="d-flex align-items-center fw-medium">
                        <i className="ti ti-info-octagon text-gray me-2" />
                        Spam
                      </span>
                      <span className="rounded-pill">0</span>
                    </Link>
                    <div>
                      <div className="more-menu">
                        <Link
                          href="#"
                          className="d-flex align-items-center justify-content-between p-2 rounded"
                        >
                          <span className="d-flex align-items-center fw-medium">
                            <i className="ti ti-location-up text-gray me-2" />
                            Important
                          </span>
                          <span className="rounded-pill">12</span>
                        </Link>
                        <Link
                          href="#"
                          className="d-flex align-items-center justify-content-between p-2 rounded"
                        >
                          <span className="d-flex align-items-center fw-medium">
                            <i className="ti ti-transition-top text-gray me-2" />
                            All Emails
                          </span>
                          <span className="rounded-pill">34</span>
                        </Link>
                      </div>
                      <div className="view-all mt-2">
                        <Link
                          href="#"
                          onClick={handleToggle}
                          className="viewall-button text-muted"
                        >
                          <span>{`${showMore ? "Less" : "Show More"}`}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-bottom mb-3 pb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h5 className="mb-0">Labels</h5>
                    <Link href="#">
                      <i className="ti ti-square-rounded-plus-filled text-primary fs-16" />
                    </Link>
                  </div>
                  <div>
                    <Link
                      href="#"
                      className="fw-medium d-flex align-items-center text-dark py-1"
                    >
                      <i className="ti ti-square-rounded text-success me-2" />{" "}
                      Team Events
                    </Link>
                    <Link
                      href="#"
                      className="fw-medium d-flex align-items-center text-dark py-1"
                    >
                      <i className="ti ti-square-rounded text-warning me-2" />{" "}
                      Work
                    </Link>
                    <Link
                      href="#"
                      className="fw-medium d-flex align-items-center text-dark py-1"
                    >
                      <i className="ti ti-square-rounded text-danger me-2" />{" "}
                      External
                    </Link>
                    <Link
                      href="#"
                      className="fw-medium d-flex align-items-center text-dark py-1"
                    >
                      <i className="ti ti-square-rounded text-skyblue me-2" />{" "}
                      Projects
                    </Link>
                    <div>
                      <div className="more-menu-2">
                        <Link
                          href="#"
                          className="fw-medium d-flex align-items-center text-dark py-1"
                        >
                          <i className="ti ti-square-rounded text-purple me-2" />{" "}
                          Applications
                        </Link>
                        <Link
                          href="#"
                          className="fw-medium d-flex align-items-center text-dark py-1"
                        >
                          <i className="ti ti-square-rounded text-info me-2" />{" "}
                          Desgin
                        </Link>
                      </div>
                      <div className="view-all mt-2">
                        <Link
                          href="#"
                          onClick={handleToggle2}
                          className="viewall-button-2 text-muted"
                        >
                          <span>{`${showMore2 ? "Less" : "Show More"}`}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h5 className="mb-0">Folders</h5>
                    <Link href="#">
                      <i className="ti ti-square-rounded-plus-filled text-primary fs-16" />
                    </Link>
                  </div>
                  <div>
                    <Link
                      href="#"
                      className="fw-medium d-flex align-items-center text-dark py-1"
                    >
                      <i className="ti ti-folder-filled text-danger me-2" />{" "}
                      Projects
                    </Link>
                    <Link
                      href="#"
                      className="fw-medium d-flex align-items-center text-dark py-1"
                    >
                      <i className="ti ti-folder-filled text-warning me-2" />{" "}
                      Personal
                    </Link>
                    <Link
                      href="#"
                      className="fw-medium d-flex align-items-center text-dark py-1"
                    >
                      <i className="ti ti-folder-filled text-success me-2" />{" "}
                      Finance
                    </Link>
                    <div>
                      <div className="more-menu-3">
                        <Link
                          href="#"
                          className="fw-medium d-flex align-items-center text-dark py-1"
                        >
                          <i className="ti ti-folder-filled text-info me-2" />{" "}
                          Projects
                        </Link>
                        <Link
                          href="#"
                          className="fw-medium d-flex align-items-center text-dark py-1"
                        >
                          <i className="ti ti-folder-filled text-primary me-2" />{" "}
                          Personal
                        </Link>
                      </div>
                      <div className="view-all mt-2">
                        <Link
                          href="#"
                          onClick={handleToggle3}
                          className="viewall-button-3 text-muted"
                        >
                          <span>{`${showMore3 ? "Less" : "Show More"}`}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </OverlayScrollbarsComponent>
            {/* Email Sidenav End */}
            <OverlayScrollbarsComponent
              className="mail-detail bg-white border-bottom p-3 w-100"
              data-simplebar=""
              style={{ height: "100%" }}
            >
              <div>
                <div className="d-flex align-items-center table-header justify-content-between flex-wrap row-gap-2 border-bottom mb-3 pb-3">
                  <div className="dropdown">
                    <button
                      className="btn border dropdown-toggle drop-arrow-none"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <span className="badge bg-dark rounded-circle badge-xs me-1">
                        5
                      </span>{" "}
                      Peoples
                      <i className="ti ti-chevron-down align-middle ms-1" />
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li>
                        <Link className="dropdown-item rounded-1" href="#">
                          Peoples
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item rounded-1" href="#">
                          Rufana
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item rounded-1" href="#">
                          Sean Hill
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item rounded-1" href="#">
                          Cameron Drake
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="d-flex align-items-center">
                    <Link
                      href="#"
                      className="btn btn-icon btn-sm rounded-circle"
                    >
                      <i className="ti ti-arrow-back-up" />
                    </Link>
                    <Link
                      href="#"
                      className="btn btn-icon btn-sm rounded-circle"
                    >
                      <i className="ti ti-arrow-back-up-double" />
                    </Link>
                    <Link
                      href="#"
                      className="btn btn-icon btn-sm rounded-circle"
                    >
                      <i className="ti ti-arrow-forward" />
                    </Link>
                    <Link
                      href="#"
                      className="btn btn-icon btn-sm rounded-circle"
                    >
                      <i className="ti ti-bookmarks-filled" />
                    </Link>
                    <Link
                      href="#"
                      className="btn btn-icon btn-sm rounded-circle"
                    >
                      <i className="ti ti-archive-filled" />
                    </Link>
                    <Link
                      href="#"
                      className="btn btn-icon btn-sm rounded-circle"
                    >
                      <i className="ti ti-mail-opened-filled" />
                    </Link>
                    <Link
                      href="#"
                      className="btn btn-icon btn-sm rounded-circle"
                    >
                      <i className="ti ti-printer" />
                    </Link>
                    <Link
                      href="#"
                      className="btn btn-icon btn-sm rounded-circle"
                    >
                      <i className="ti ti-star-filled text-warning" />
                    </Link>
                  </div>
                </div>
                <div className="bg-light card mb-3">
                  <div className="card-body">
                    <div className="d-flex align-items-center flex-fill border-bottom mb-3 pb-3">
                      <Link
                        href="#"
                        className="avatar avatar-md avatar-rounded flex-shrink-0 me-2"
                      >
                        <ImageWithBasePath
                          src="assets/img/profiles/avatar-01.jpg"
                          alt="Img"
                        />
                      </Link>
                      <div className="flex-fill">
                        <div className="d-flex align-items-start justify-content-between flex-wrap row-gap-2">
                          <div>
                            <h6 className="fs-16 mb-1">
                              <Link href="#">Angela Thomas</Link>
                            </h6>
                            <p className="mb-0">Subject: Client Dashboard</p>
                          </div>
                          <div className="d-flex align-items-center">
                            <p className="me-2 mb-0">12:45 AM</p>
                            <Link
                              href="#"
                              className="btn btn-icon btn-sm rounded-circle"
                            >
                              <i className="ti ti-arrow-back-up" />
                            </Link>
                            <Link
                              href="#"
                              className="btn btn-icon btn-sm rounded-circle"
                            >
                              <i className="ti ti-arrow-back-up-double" />
                            </Link>
                            <Link
                              href="#"
                              className="btn btn-icon btn-sm rounded-circle"
                            >
                              <i className="ti ti-printer" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center flex-wrap row-gap-2">
                      <p className="mb-0 text-dark me-3">
                        <span className="text-gray">From: </span> Arman Janes
                      </p>
                      <p className="mb-0 text-dark me-3">
                        <span className="text-gray">To: </span> Angela Thomas
                      </p>
                      <p className="mb-0 text-dark">
                        <span className="text-gray">Cc: </span> Angela Thomas,
                        Justin Lapointe
                      </p>
                    </div>
                  </div>{" "}
                  {/* end card body */}
                </div>{" "}
                {/* end card */}
                <div className="card shadow-none">
                  <div className="card-body">
                    <div>
                      <h6 className="fs-16 mb-2">Dear Angela</h6>
                      <p className="text-dark">
                        I am writing to request a meeting to discuss the
                        progress and next steps for Project. We have reached a
                        critical milestone, and I believe a discussion will help
                        align our efforts and ensure we are on track to meet our
                        goals.
                      </p>
                      <p className="text-dark">
                        am available on Tuesday and Thursday afternoons, but I
                        am flexible and can adjust to a time that suits you best
                      </p>
                      <p className="text-dark">
                        Looking forward to your response.
                      </p>
                      <p className="text-dark">
                        Best regards, <br />
                        <b className="fw-medium d-flex mt-1">Arman</b>{" "}
                      </p>
                    </div>
                    <div className="d-flex align-items-center justify-content-between my-3 pt-3 border-top">
                      <h5>Attachments</h5>
                      <Link href="#" className="text-primary fw-medium">
                        Download All
                      </Link>
                    </div>
                    <div className="d-flex align-items-center img-full-view">
                      <Link
                        href="assets/img/media/email-attach-big-01.jpg"
                        data-fancybox="gallery"
                        className="avatar avatar-xl me-3 gallery-item"
                      >
                        <ImageWithBasePath
                          src="assets/img/media/email-attach-01.jpg"
                          className=" rounded"
                          alt="img"
                        />
                        <span className="avatar avatar-md avatar-rounded">
                          <i className="ti ti-eye" />
                        </span>
                      </Link>
                      <Link
                        href="assets/img/media/email-attach-big-02.jpg"
                        data-fancybox="gallery"
                        className="avatar avatar-xl me-3 gallery-item"
                      >
                        <ImageWithBasePath
                          src="assets/img/media/email-attach-02.jpg"
                          className="rounded"
                          alt="img"
                        />
                        <span className="avatar avatar-md avatar-rounded">
                          <i className="ti ti-eye" />
                        </span>
                      </Link>
                      <Link
                        href="assets/img/media/email-attach-big-03.jpg"
                        data-fancybox="gallery"
                        className="avatar avatar-xl me-3 gallery-item"
                      >
                        <ImageWithBasePath
                          src="assets/img/media/email-attach-03.jpg"
                          className="rounded"
                          alt="img"
                        />
                        <span className="avatar avatar-md avatar-rounded">
                          <i className="ti ti-eye" />
                        </span>
                      </Link>
                    </div>
                  </div>{" "}
                  {/* end card body */}
                </div>{" "}
                {/* end card */}
                <div className="card shadow-none">
                  <div className="card-body">
                    <div className="bg-light rounded p-3 mb-3">
                      <div className="d-flex align-items-center flex-wrap row-gap-2 flex-fill">
                        <Link
                          href="#"
                          className="avatar avatar-md avatar-rounded flex-shrink-0 me-2"
                        >
                          <ImageWithBasePath
                            src="assets/img/profiles/avatar-01.jpg"
                            alt="Img"
                          />
                        </Link>
                        <div className="flex-fill">
                          <div className="d-flex align-items-start justify-content-between flex-wrap row-gap-2">
                            <div>
                              <h6 className="fs-16 mb-1">
                                <Link href="#">Arman Janes</Link>
                              </h6>
                              <div className="d-flex align-items-center">
                                <p className="mb-0">
                                  <span>To: </span> Me
                                </p>
                                <div className="dropdown">
                                  <Link
                                    href="#"
                                    className="dropdown-toggle bg-transparent text-dark border-0 p-0 btn-sm"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                  ></Link>
                                  <ul className="dropdown-menu dropdown-menu-end">
                                    <li>
                                      <Link className="dropdown-item" href="#">
                                        <span className="text-gray">
                                          From :
                                        </span>{" "}
                                        Arman Janes arman@example.com
                                      </Link>
                                    </li>
                                    <li>
                                      <Link className="dropdown-item" href="#">
                                        <span className="text-gray">To :</span>{" "}
                                        Angela Thomas angela@example.com
                                      </Link>
                                    </li>
                                    <li>
                                      <Link className="dropdown-item" href="#">
                                        <span className="text-gray">
                                          Date :
                                        </span>{" "}
                                        12 May 2025, 09:45 PM{" "}
                                      </Link>
                                    </li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                            <div className="d-flex align-items-center">
                              <p className="me-2 mb-0">Yesterday 01:22 AM</p>
                              <Link
                                href="#"
                                className="btn btn-icon btn-sm rounded-circle"
                              >
                                <i className="ti ti-arrow-back-up" />
                              </Link>
                              <Link
                                href="#"
                                className="btn btn-icon btn-sm rounded-circle"
                              >
                                <i className="ti ti-arrow-back-up-double" />
                              </Link>
                              <Link
                                href="#"
                                className="btn btn-icon btn-sm rounded-circle"
                              >
                                <i className="ti ti-printer" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h6 className="fs-16 mb-2">Dear Arman</h6>
                      <p className="text-dark">
                        Introduction Mail from Techsolutions!!!
                      </p>
                      <p className="text-dark">
                        Best regards <br />
                        <b className="fw-medium d-inline-flex mt-1">Arman</b>
                      </p>
                    </div>
                    <form>
                      <div className="border rounded mt-3">
                        <div className="p-3 position-relative border-bottom">
                          <div className="tag-with-img d-flex align-items-center">
                            <label className="form-label me-2 mb-0">To</label>
                            <input
                              className="input-tags form-control border-0 h-100 shadow-none"
                              data-choices=""
                              data-choices-limit={3}
                              data-choices-removeitem=""
                              type="text"
                              defaultValue="Angela Thomas"
                            />
                          </div>
                          <div className="d-flex align-items-center position-absolute end-0 pe-3 top-50 translate-middle-y">
                            <Link href="#" className="d-inline-flex me-2">
                              Cc
                            </Link>
                            <Link href="#" className="d-inline-flex">
                              Bcc
                            </Link>
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="mb-3">
                            <textarea
                              rows={2}
                              className="form-control border-0 p-0 bg-transparent shadow-none"
                              defaultValue={""}
                            />
                          </div>
                        </div>
                        <div className="d-flex align-items-center justify-content-between border-top p-3 flex-wrap">
                          <div className="d-flex align-items-center">
                            <Link
                              href="#"
                              className="btn btn-icon btn-sm rounded-circle"
                            >
                              <i className="ti ti-paperclip" />
                            </Link>
                            <Link
                              href="#"
                              className="btn btn-icon btn-sm rounded-circle"
                            >
                              <i className="ti ti-photo" />
                            </Link>
                            <Link
                              href="#"
                              className="btn btn-icon btn-sm rounded-circle"
                            >
                              <i className="ti ti-link" />
                            </Link>
                            <Link
                              href="#"
                              className="btn btn-icon btn-sm rounded-circle"
                            >
                              <i className="ti ti-pencil" />
                            </Link>
                            <Link
                              href="#"
                              className="btn btn-icon btn-sm rounded-circle"
                            >
                              <i className="ti ti-mood-smile" />
                            </Link>
                          </div>
                          <div className="d-flex align-items-center">
                            <Link
                              href="#"
                              className="btn btn-icon btn-sm rounded-circle"
                            >
                              <i className="ti ti-calendar-repeat" />
                            </Link>
                            <Link
                              href="#"
                              className="btn btn-icon btn-sm rounded-circle"
                            >
                              <i className="ti ti-trash" />
                            </Link>
                            <button
                              type="submit"
                              className="btn btn-primary d-inline-flex align-items-center ms-2"
                            >
                              Send <i className="ti ti-arrow-right ms-2" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>{" "}
                  {/* end card body */}
                </div>{" "}
                {/* end card */}
                <div className="text-center">
                  <Link href="#" className="btn btn-dark btn-sm">
                    View Older Messages
                  </Link>
                </div>
              </div>
            </OverlayScrollbarsComponent>
          </div>
        </div>
        {/* End Content */}
      </div>
      {/* ========================
			End Page Content
		========================= */}

      <div
        id="compose-view"
        className={`${
          show ? "show" : ""
        } position-fixed top-0 start-0 w-100 h-100 align-items-end justify-content-end`}
      >
        <div className="bg-white border-0 rounded compose-view position-relative">
          <div className="compose-header d-flex align-items-center justify-content-between bg-dark p-3">
            <h5 className="text-white mb-0">Compose New Email</h5>
            <div className="d-flex align-items-center">
              <Link href="#" className="d-inline-flex me-2 text-white fs-16">
                <i className="ti ti-minus" />
              </Link>
              <Link href="#" className="d-inline-flex me-2 fs-16 text-white">
                <i className="ti ti-maximize" />
              </Link>
              <button
                className="bg-transparent border-0 fs-16 text-white position-static p-0"
                id="compose-close"
                onClick={() => setShow(false)}
              >
                <i className="ti ti-x text-white" />
              </button>
            </div>
          </div>
          <form>
            <div className="p-3 position-relative pb-2 border-bottom">
              <div className="tag-with-img d-flex align-items-center">
                <label className="form-label me-2 mb-0">To</label>
                <input
                  className="input-tags form-control border-0 h-100"
                  data-choices=""
                  data-choices-limit={3}
                  data-choices-removeitem=""
                  type="text"
                  defaultValue="Angela Thomas"
                />
              </div>
              <div className="d-flex align-items-center position-absolute end-0 pe-3 top-50 translate-middle-y">
                <Link href="#" className="d-inline-flex me-2">
                  Cc
                </Link>
                <Link href="#" className="d-inline-flex">
                  Bcc
                </Link>
              </div>
            </div>
            <div className="p-3 border-bottom">
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Subject"
                />
              </div>
              <div className="mb-0">
                <textarea
                  rows={7}
                  className="form-control"
                  placeholder="Compose Email"
                  defaultValue={""}
                />
              </div>
            </div>
            <div className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <Link href="#" className="btn btn-icon btn-sm rounded-circle">
                  <i className="ti ti-paperclip" />
                </Link>
                <Link href="#" className="btn btn-icon btn-sm rounded-circle">
                  <i className="ti ti-photo" />
                </Link>
                <Link href="#" className="btn btn-icon btn-sm rounded-circle">
                  <i className="ti ti-link" />
                </Link>
                <Link href="#" className="btn btn-icon btn-sm rounded-circle">
                  <i className="ti ti-pencil" />
                </Link>
                <Link href="#" className="btn btn-icon btn-sm rounded-circle">
                  <i className="ti ti-mood-smile" />
                </Link>
              </div>
              <div className="d-flex align-items-center compose-footer">
                <Link href="#" className="btn btn-icon btn-sm rounded-circle">
                  <i className="ti ti-calendar-repeat" />
                </Link>
                <Link href="#" className="btn btn-icon btn-sm rounded-circle">
                  <i className="ti ti-trash" />
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary d-inline-flex align-items-center ms-2"
                >
                  Send
                  <i className="ti ti-arrow-right ms-2" />
                </button>
              </div>
            </div>
          </form>{" "}
          {/* end form */}
        </div>
      </div>
      {show && <div className="modal-backdrop fade show"></div>}
    </>
  );
};

export default EmailReplyComponent;
