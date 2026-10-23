"use client";


import Link from "next/link";


const Footer = () => {
  return (
   <>
  {/* Footer Start */}
  <div className="footer text-center bg-white p-2 border-top">
    <p className="text-dark mb-0">
      2025 ©
      <Link href="#" className="link-primary">
      Preclinic
      </Link>
      , All Rights Reserved
    </p>
  </div>
  {/* Footer End */}
</>

  );
};

export default Footer;
