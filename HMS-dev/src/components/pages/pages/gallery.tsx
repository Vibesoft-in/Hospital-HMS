"use client";

import React from "react";
import Link from "next/link";
import ImageWithBasePath from "@/core/imageWithBasePath";
import "yet-another-react-lightbox/styles.css";
import Lightbox from "yet-another-react-lightbox";

const GalleryComponent = () => {
  const [open1, setOpen1] = React.useState(false);
  const [open2, setOpen2] = React.useState(false);
  const [open3, setOpen3] = React.useState(false);
  const [open4, setOpen4] = React.useState(false);
  const [open5, setOpen5] = React.useState(false);
  const [open6, setOpen6] = React.useState(false);
  const [open7, setOpen7] = React.useState(false);
  const [open8, setOpen8] = React.useState(false);
  const [open9, setOpen9] = React.useState(false);
  const [open10, setOpen10] = React.useState(false);
  const [open11, setOpen11] = React.useState(false);
  const [open12, setOpen12] = React.useState(false);
  const [open13, setOpen13] = React.useState(false);
  const [open14, setOpen14] = React.useState(false);
  const [open15, setOpen15] = React.useState(false);

  return (
    <>
      {/* ========================
			Start Page Content
		========================= */}
      <div className="page-wrapper">
        {/* Start Content */}
        <div className="content">
          {/* Page Header */}
          <div className="pb-3 mb-3 border-bottom">
            <h4 className="fw-bold mb-0">Gallery</h4>
          </div>
          {/* End Page Header */}
          <div className="card">
            <div className="card-body">
              {/* start row */}
              <div className="row row-gap-3 mb-3">
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open1}
                      close={() => setOpen1(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen1(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-01.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open2}
                      close={() => setOpen2(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen2(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-02.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open3}
                      close={() => setOpen3(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen3(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-03.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open4}
                      close={() => setOpen4(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen4(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-04.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open5}
                      close={() => setOpen5(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen5(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-05.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
              </div>
              {/* end row */}
              {/* start row */}
              <div className="row row-gap-3 mb-3">
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open6}
                      close={() => setOpen6(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen6(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-06.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open7}
                      close={() => setOpen7(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen7(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-07.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open8}
                      close={() => setOpen8(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen8(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-08.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open9}
                      close={() => setOpen9(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen9(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-09.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open10}
                      close={() => setOpen10(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen10(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-10.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
              </div>
              {/* end row */}
              {/* start row */}
              <div className="row row-gap-3">
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open11}
                      close={() => setOpen11(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen11(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-11.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open12}
                      close={() => setOpen12(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen12(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-12.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open13}
                      close={() => setOpen13(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen13(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-13.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open14}
                      close={() => setOpen14(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen14(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-14.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
                <div className="col-md-6 col-xl">
                  <Lightbox
                      open={open15}
                      close={() => setOpen15(false)}
                      slides={[
                          { src: "assets/img/gallery/gallery-img-01.jpg" },
                          { src: "assets/img/gallery/gallery-img-02.jpg" },
                          { src: "assets/img/gallery/gallery-img-03.jpg" },
                          { src: "assets/img/gallery/gallery-img-04.jpg" },
                          { src: "assets/img/gallery/gallery-img-05.jpg" },
                          { src: "assets/img/gallery/gallery-img-06.jpg" },
                          { src: "assets/img/gallery/gallery-img-07.jpg" },
                          { src: "assets/img/gallery/gallery-img-08.jpg" },
                          { src: "assets/img/gallery/gallery-img-09.jpg" },
                          { src: "assets/img/gallery/gallery-img-10.jpg" },
                          { src: "assets/img/gallery/gallery-img-11.jpg" },
                          { src: "assets/img/gallery/gallery-img-12.jpg" },
                          { src: "assets/img/gallery/gallery-img-13.jpg" },
                          { src: "assets/img/gallery/gallery-img-14.jpg" },
                          { src: "assets/img/gallery/gallery-img-15.jpg" },
                      ]}
                  />
                  <Link
                      href="#"
                      onClick={() => setOpen15(true)}
                      className="gallery-item"
                  >
                      <ImageWithBasePath
                          src="assets/img/gallery/gallery-img-15.jpg"
                          className="img-fluid rounded w-100"
                          alt="Office workspace with computer and coffee"
                      />
                  </Link>
                </div>
                {/* end col */}
              </div>
              {/* end row */}
            </div>
            {/* end card body */}
          </div>
          {/* end card */}
        </div>
        {/* End Content */}
      </div>
      {/* ========================
			End Page Content
		========================= */}
    </>
  );
};

export default GalleryComponent;
