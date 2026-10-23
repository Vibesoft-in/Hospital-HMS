"use client";

import Link from "next/link";

const TermsConditionsComponent = () => {
  return (
    <>
      <>
  {/* ========================
			Start Page Content
		========================= */}
        <div className="page-wrapper">
            {/* Start Content */}
            <div className="content">
            {/* Page Header */}
            <div className="pb-3 mb-3 border-bottom">
                <h4 className="fw-bold mb-0">Terms &amp; Conditions</h4>
            </div>
            {/* End Page Header */}
            <div className="card">
                <div className="card-body">
                <p>
                    These terms and conditions govern your use of the PreClinic
                    platform, which provides digital tools for managing healthcare
                    operations, including patient intake, scheduling, medical
                    recordkeeping, and communication. By accessing or using this
                    platform, you agree to abide by these terms and all applicable laws
                    and regulations, including those related to patient privacy and data
                    protection. If you do not agree with any part of these terms, you
                    should not use the platform.
                </p>
                <div className="mb-3">
                    <h6 className="fw-bold mb-3">Acceptance of Terms</h6>
                    <p>
                    By accessing or using the PreClinic platform, you acknowledge that
                    you have read, understood, and agree to be bound by these Terms
                    and Conditions, including our Privacy Policy. If you do not agree
                    with any part of these terms, you must not access or use the
                    platform.
                    </p>
                </div>
                <div className="mb-3">
                    <h6 className="fw-bold mb-3">User Responsibilities</h6>
                    <p>We may use the information we collect to:</p>
                    <ul className="unorder-list">
                    <li className="list-item">
                        <p className="fw-medium">Provide Accurate Information.</p>
                    </li>
                    <li className="list-item">
                        <p className="fw-medium">Maintain Account Security.</p>
                    </li>
                    <li className="list-item">
                        <p className="fw-medium">Use the Platform Appropriately.</p>
                    </li>
                    <li className="list-item">
                        <p className="fw-medium">
                        Respect Privacy and Confidentiality.
                        </p>
                    </li>
                    <li className="list-item">
                        <p className="fw-medium">Compliance with Laws and Policies.</p>
                    </li>
                    </ul>
                </div>
                <div className="mb-3">
                    <h6 className="fw-bold mb-3">Platform Usage</h6>
                    <p>
                    The PreClinic platform allows you to manage patient data, schedule
                    appointments, review medical records, and perform other clinical
                    and administrative functions. You are responsible for ensuring the
                    accuracy, completeness, and lawful handling of all information
                    entered into the system, including compliance with applicable
                    healthcare regulations and privacy standards such as HIPAA.
                    </p>
                </div>
                <div className="mb-3">
                    <h6 className="fw-bold mb-3">Restrictions</h6>
                    <p>You agree not to:</p>
                    <ul className="unorder-list">
                    <li className="list-item">
                        <p className="fw-medium">
                        Dot not Share access any data, systems, or features that you
                        are not explicitly authorized to use.
                        </p>
                    </li>
                    <li className="list-item">
                        <p className="fw-medium">
                        Do not share login credentials or allow unauthorized users to
                        access the platform under your account.
                        </p>
                    </li>
                    <li className="list-item">
                        <p className="fw-medium">
                        Do not enter, upload, or store false, misleading, or
                        fabricated patient or medical data.
                        </p>
                    </li>
                    <li className="list-item">
                        <p className="fw-medium">
                        Do not modify or delete records without proper authorization
                        or clinical justification.
                        </p>
                    </li>
                    </ul>
                </div>
                <div className="mb-3">
                    <h6 className="fw-bold mb-3">Intellectual Property</h6>
                    <p>
                    All content, software, designs, and materials associated with the
                    PreClinic platform — including but not limited to user interfaces,
                    workflows, branding, documentation, and proprietary tools — are
                    the exclusive property of PreClinic or its licensors.
                    </p>
                </div>
                <div className="mb-3">
                    <h6 className="fw-bold mb-3">Termination</h6>
                    <p>
                    We reserve the right to suspend, restrict, or permanently
                    terminate your access to the PreClinic platform at any time, with
                    or without prior notice,:
                    </p>
                    <ul className="unorder-list">
                    <li className="list-item">
                        <p className="fw-medium">
                        You violate any part of these Terms and Conditions.
                        </p>
                    </li>
                    <li className="list-item">
                        <p className="fw-medium">
                        You misuse the platform or engage in unauthorized or unlawful
                        activity.
                        </p>
                    </li>
                    <li className="list-item">
                        <p className="fw-medium">
                        You compromise the security, integrity, or confidentiality of
                        patient or system data.
                        </p>
                    </li>
                    <li className="list-item">
                        <p className="fw-medium">
                        Required by law or regulatory authorities.
                        </p>
                    </li>
                    <li className="list-item">
                        <p className="fw-medium">
                        Your actions interfere with normal platform operations or the
                        delivery of care.
                        </p>
                    </li>
                    </ul>
                </div>
                <div className="mb-3">
                    <h6 className="fw-bold mb-3">Disclaimer of Warranties</h6>
                    <p>
                    The PreClinic platform is provided on an "as is" and "as
                    available" basis. We make no guarantees that the platform will
                    operate without interruptions, delays, errors, or security
                    vulnerabilities.
                    </p>
                </div>
                <div className="mb-3">
                    <h6 className="fw-bold mb-3">Limitation of Liability</h6>
                    <p>
                    In no event shall PreClinic, its affiliates, developers, or
                    service providers be liable for any direct, indirect, incidental,
                    special, punitive, or consequential damages
                    </p>
                </div>
                <div className="mb-0">
                    <h6 className="fw-bold mb-3">Modifications to Terms</h6>
                    <p className="mb-0">
                    We reserve the right to modify or update these Terms and
                    Conditions at any time. Any changes will be posted on this page
                    with a revised effective date. It is your responsibility to review
                    these terms periodically to stay informed of any updates.
                    </p>
                </div>
                </div>
                {/* end card body */}
            </div>
            {/* end card */}
            </div>
            {/* End Content */}
            {/* Footer Start */}
            <div className="footer text-center bg-white p-2 border-top">
            <p className="text-dark mb-0">
                2025 ©{" "}
                <Link href="#" className="link-primary">
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

    </>
  );
};

export default TermsConditionsComponent;
