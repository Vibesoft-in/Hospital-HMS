"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import dayjs from "dayjs";
import {
  extractFhirRecordData,
  getFhirHealthRecord,
  getFhirHiTypeLabel,
} from "@/core/api/fhirHealthRecordApi";
import type { IFhirAttachment, IFhirHealthRecordListItem } from "@/core/types/fhirHealthRecord";
import HealthHistoryDetailModal from "@/components/pages/clinic-modules/patient-details/HealthHistoryDetailModal";
import {
  buildFhirRecordViewSections,
  getAttachmentUrl,
  isImageAttachment,
  isPdfAttachment,
} from "./fhirRecordViewHelpers";

interface IViewHealthRecordModalProps {
  open: boolean;
  recordId: string | null;
  onClose: () => void;
}

const OFFCANVAS_STYLE: CSSProperties = {
  visibility: "visible",
  width: "min(960px, 100vw - 1rem)",
  zIndex: 1045,
  top: 0,
  right: 0,
  height: "100vh",
};

const resolveRecordStatus = (record: IFhirHealthRecordListItem | null): string => {
  if (!record) return "—";
  const raw = (record.metadata?.status || record.status || "").trim();
  if (!raw) return record.finalizedAt ? "Final" : "Draft";
  if (raw.toLowerCase() === "final") return "Final";
  if (raw.toLowerCase() === "draft") return "Draft";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const resolveRecordDate = (record: IFhirHealthRecordListItem | null): string => {
  const raw = record?.metadata?.date || record?.createdAt || record?.updatedAt || "";
  if (!raw) return "—";
  const date = dayjs(raw);
  return date.isValid() ? date.format("DD MMM YYYY, HH:mm") : raw;
};

interface IAttachmentPreviewProps {
  attachment: IFhirAttachment;
}

const AttachmentPreview = ({ attachment }: IAttachmentPreviewProps) => {
  const href = getAttachmentUrl(attachment);
  if (!href) return null;

  const isImage = isImageAttachment(attachment.contentType);
  const isPdf = isPdfAttachment(attachment.contentType);

  return (
    <div className="border rounded-3 p-3 mb-2 last:mb-0">
      <div className="d-flex align-items-start justify-content-between gap-2 mb-2 flex-wrap">
        <span className="text-dark fw-medium fs-14">{attachment.title || "Attachment"}</span>
        <span className="badge bg-light text-dark text-uppercase">{attachment.contentType}</span>
      </div>

      {isImage ? (
        <div className="bg-light rounded border p-2 mb-2 text-center">
          <img
            src={href}
            alt={attachment.title || "Attachment"}
            className="img-fluid rounded w-100 h-auto"
            style={{ maxHeight: "min(400px, 60vh)", objectFit: "contain" }}
          />
        </div>
      ) : null}

      <div className="d-flex gap-2 flex-wrap">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline-primary"
        >
          <i className={`ti ${isPdf ? "ti-file-type-pdf" : "ti-external-link"} me-1`} />
          {isPdf ? "View PDF" : "Open"}
        </a>
        <a href={href} download={attachment.title || "attachment"} className="btn btn-sm btn-outline-secondary">
          <i className="ti ti-download me-1" />
          Download
        </a>
      </div>
    </div>
  );
};

const ViewHealthRecordModal = ({ open, recordId, onClose }: IViewHealthRecordModalProps) => {
  const [record, setRecord] = useState<IFhirHealthRecordListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !recordId?.trim()) {
      setRecord(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchRecord = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getFhirHealthRecord(recordId.trim());
        if (cancelled) return;
        setRecord(result);
      } catch (err: unknown) {
        if (cancelled) return;
        setRecord(null);
        setError(err instanceof Error ? err.message : "Failed to load health record");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchRecord();
    return () => {
      cancelled = true;
    };
  }, [open, recordId]);

  const fhirBundle = record?.fhirBundle;
  const hasFhirBundle = Boolean(fhirBundle && typeof fhirBundle === "object");

  const clinicalData = useMemo(
    () => (record ? extractFhirRecordData(record) : {}),
    [record]
  );

  const sections = useMemo(
    () => buildFhirRecordViewSections(record?.hiType, clinicalData),
    [record?.hiType, clinicalData]
  );

  const attachments = Array.isArray(record?.attachments) ? record.attachments : [];
  const title = getFhirHiTypeLabel(typeof record?.hiType === "string" ? record.hiType : undefined);

  if (!open) return null;

  if (hasFhirBundle && record) {
    return (
      <HealthHistoryDetailModal
        open={open}
        onClose={onClose}
        item={{ fhirBundle, attachments: record.attachments }}
        title={title}
      />
    );
  }

  return (
    <>
      <div
        className="offcanvas-backdrop fade show"
        onClick={onClose}
        style={{ zIndex: 1040 }}
        aria-hidden="true"
      />
      <div
        className="offcanvas offcanvas-end show d-flex flex-column"
        style={OFFCANVAS_STYLE}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="view_health_record_title"
      >
        <div className="offcanvas-header border-bottom flex-shrink-0">
          <div>
            <h5 id="view_health_record_title" className="offcanvas-title fw-bold text-dark mb-1">
              {title}
            </h5>
            {record ? (
              <>
                <span className="text-muted fs-13 d-block">{resolveRecordDate(record)}</span>
                <span className="badge badge-soft-primary mt-1">{resolveRecordStatus(record)}</span>
              </>
            ) : null}
          </div>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>

        <div className="offcanvas-body overflow-auto flex-grow-1">
          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading health record…</span>
              </div>
            </div>
          ) : null}

          {!loading && error ? (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          ) : null}

          {!loading && !error && record ? (
            <>
              {record.metadata?.authorName || record.metadata?.organizationName ? (
                <div className="border rounded-3 mb-3 overflow-hidden">
                  <div className="bg-light px-3 py-2 border-bottom">
                    <h6 className="fw-bold mb-0 text-dark fs-14">Record Info</h6>
                  </div>
                  <div className="p-3 row g-3">
                    {record.metadata?.authorName ? (
                      <div className="col-12 col-md-6">
                        <span className="text-muted fs-12 d-block mb-1">Author</span>
                        <span className="text-dark fw-medium fs-14">{record.metadata.authorName}</span>
                      </div>
                    ) : null}
                    {record.metadata?.organizationName ? (
                      <div className="col-12 col-md-6">
                        <span className="text-muted fs-12 d-block mb-1">Organization</span>
                        <span className="text-dark fw-medium fs-14">
                          {record.metadata.organizationName}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {sections.map((section) => (
                <div key={section.title} className="border rounded-3 mb-3 overflow-hidden">
                  <div className="bg-light px-3 py-2 border-bottom">
                    <h6 className="fw-bold mb-0 text-dark fs-14">{section.title}</h6>
                  </div>
                  <div className="p-3">
                    {section.rows.length ? (
                      <div className="row g-3 mb-2">
                        {section.rows.map((row) => (
                          <div key={`${section.title}-${row.label}`} className="col-12 col-md-6">
                            <span className="text-muted fs-12 d-block mb-1">{row.label}</span>
                            <span className="text-dark fs-14">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {section.lists.map((list) => (
                      <div key={`${section.title}-${list.label}`} className="mb-2 last:mb-0">
                        <span className="text-muted fs-12 d-block mb-1">{list.label}</span>
                        <ul className="list-unstyled mb-0">
                          {list.items.map((item, index) => (
                            <li key={`${list.label}-${index}`} className="text-dark fs-14 py-1">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {attachments.length ? (
                <div className="border rounded-3 mb-3 overflow-hidden">
                  <div className="bg-light px-3 py-2 border-bottom">
                    <h6 className="fw-bold mb-0 text-dark fs-14">Attachments</h6>
                  </div>
                  <div className="p-3">
                    {attachments.map((attachment, index) => (
                      <AttachmentPreview
                        key={`${attachment.s3Key}-${index}`}
                        attachment={attachment}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {!sections.length && !attachments.length ? (
                <p className="text-muted mb-0">No clinical details available for this record.</p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="offcanvas-footer border-top flex-shrink-0 p-3 d-flex justify-content-end">
          <button type="button" className="btn btn-light" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );
};

export default ViewHealthRecordModal;
