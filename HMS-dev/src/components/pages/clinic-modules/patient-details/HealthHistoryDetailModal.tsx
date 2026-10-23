"use client";

import { useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import dayjs from "dayjs";

interface IHealthHistoryDetailModalProps {
  open: boolean;
  onClose: () => void;
  item: Record<string, unknown> | null;
  title?: string;
}

const OFFCANVAS_STYLE: CSSProperties = {
  visibility: "visible",
  width: "min(960px, 100vw - 1rem)",
  zIndex: 1045,
  top: 0,
  right: 0,
  height: "100vh",
};

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const readString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const readCodeableText = (value: unknown): string | null => {
  const obj = asObject(value);
  if (!obj) return null;
  const text = readString(obj.text);
  if (text) return text;
  if (Array.isArray(obj.coding)) {
    for (const codingItem of obj.coding) {
      const coding = asObject(codingItem);
      const display = readString(coding?.display);
      if (display) return display;
      const code = readString(coding?.code);
      if (code) return code;
    }
  }
  return null;
};

const readHumanName = (resource: Record<string, unknown> | null): string | null => {
  if (!resource) return null;
  if (Array.isArray(resource.name)) {
    for (const nameItem of resource.name) {
      const nameObj = asObject(nameItem);
      const text = readString(nameObj?.text);
      if (text) return text;
    }
  }
  return readString(resource.name);
};

const formatDate = (value: string | null): string => {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD MMM YYYY, HH:mm") : value;
};

const formatDateShort = (value: string | null): string => {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD MMM YYYY") : value;
};

const stripHtml = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const readNarrative = (resource: Record<string, unknown> | null): string | null => {
  const text = asObject(resource?.text);
  const div = readString(text?.div);
  return div ? stripHtml(div) : null;
};

const readQuantityValue = (value: unknown): string | null => {
  const qty = asObject(value);
  if (!qty) return null;
  const val = readString(qty.value);
  const unit = readString(qty.unit) || readString(qty.code);
  if (!val) return null;
  return unit ? `${val} ${unit}` : val;
};

const readPeriodValue = (value: unknown): string | null => {
  const period = asObject(value);
  if (!period) return null;
  const start = readString(period.start);
  const end = readString(period.end);
  if (!start && !end) return null;
  return `${start ? formatDateShort(start) : "—"} – ${end ? formatDateShort(end) : "—"}`;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URN_UUID_PATTERN = /^urn:uuid:[0-9a-f-]+$/i;
const HEX_ID_PATTERN = /^[0-9a-f]{16,}$/i;

const isOpaqueId = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (URN_UUID_PATTERN.test(trimmed)) return true;
  if (UUID_PATTERN.test(trimmed)) return true;
  if (HEX_ID_PATTERN.test(trimmed)) return true;

  const slashMatch = trimmed.match(/^[A-Za-z]+\/(.+)$/);
  if (slashMatch?.[1]) {
    const idPart = slashMatch[1];
    if (URN_UUID_PATTERN.test(idPart)) return true;
    if (UUID_PATTERN.test(idPart)) return true;
    if (HEX_ID_PATTERN.test(idPart)) return true;
  }

  return false;
};

const sanitizeDisplayValue = (value: string | null | undefined): string | null => {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (isOpaqueId(trimmed)) return null;

  const labelSeparator = trimmed.lastIndexOf(": ");
  if (labelSeparator > 0) {
    const idPart = trimmed.slice(labelSeparator + 2).trim();
    if (isOpaqueId(idPart)) return null;
  }

  return trimmed;
};

const readReferenceDisplay = (value: unknown): string | null => {
  const ref = asObject(value);
  const display = sanitizeDisplayValue(readString(ref?.display));
  if (display) return display;

  const reference = readString(ref?.reference);
  if (!reference) return null;
  return sanitizeDisplayValue(reference);
};

const readIdentifiers = (resource: Record<string, unknown> | null): string[] => {
  if (!resource || !Array.isArray(resource.identifier)) return [];
  return resource.identifier
    .map((item) => {
      const identifier = asObject(item);
      if (!identifier) return null;
      const value = readString(identifier.value);
      if (!value || isOpaqueId(value)) return null;
      const system = readString(identifier.system);
      const typeText = readCodeableText(identifier.type);
      const label = typeText || (system ? system.split("/").pop() : null);
      return label ? `${label}: ${value}` : value;
    })
    .filter((value): value is string => Boolean(value));
};

const readTelecoms = (resource: Record<string, unknown> | null): string[] => {
  if (!resource || !Array.isArray(resource.telecom)) return [];
  return resource.telecom
    .map((item) => {
      const telecom = asObject(item);
      if (!telecom) return null;
      const value = readString(telecom.value);
      if (!value) return null;
      const system = readString(telecom.system);
      const use = readString(telecom.use);
      const prefix = [system, use].filter(Boolean).join(" ");
      return prefix ? `${prefix}: ${value}` : value;
    })
    .filter((value): value is string => Boolean(value));
};

const readAddresses = (resource: Record<string, unknown> | null): string[] => {
  if (!resource || !Array.isArray(resource.address)) return [];
  return resource.address
    .map((item) => {
      const address = asObject(item);
      if (!address) return null;
      return (
        readString(address.text) ||
        [address.line, address.city, address.state, address.postalCode, address.country]
          .flat()
          .map((part) => readString(part))
          .filter(Boolean)
          .join(", ") ||
        null
      );
    })
    .filter((value): value is string => Boolean(value));
};

const readNotes = (resource: Record<string, unknown> | null): string[] => {
  if (!resource || !Array.isArray(resource.note)) return [];
  return resource.note
    .map((item) => readString(asObject(item)?.text))
    .filter((value): value is string => Boolean(value));
};

const readObservationValue = (observation: Record<string, unknown>): string | null => {
  if (Array.isArray(observation.component) && observation.component.length) {
    const parts = observation.component
      .map((item) => {
        const component = asObject(item);
        if (!component) return null;
        const label = readCodeableText(component.code) || "Component";
        const value = readObservationValue({ ...component, component: undefined });
        return value ? `${label}: ${value}` : null;
      })
      .filter((value): value is string => Boolean(value));
    if (parts.length) return parts.join("; ");
  }

  return (
    readString(observation.valueString) ||
    readQuantityValue(observation.valueQuantity) ||
    readCodeableText(observation.valueCodeableConcept) ||
    (observation.valueBoolean === true
      ? "Yes"
      : observation.valueBoolean === false
        ? "No"
        : null) ||
    (observation.valueInteger != null ? String(observation.valueInteger) : null) ||
    readString(observation.valueDateTime) ||
    readPeriodValue(observation.valuePeriod) ||
    readReferenceDisplay(observation.valueReference) ||
    null
  );
};

const readDosageInstructions = (resource: Record<string, unknown>): string[] => {
  if (!Array.isArray(resource.dosageInstruction)) return [];
  return resource.dosageInstruction
    .map((item) => {
      const dosage = asObject(item);
      if (!dosage) return null;
      const text = readString(dosage.text);
      if (text) return text;

      const parts: string[] = [];
      const doseQuantity = readQuantityValue(
        asObject(asObject(Array.isArray(dosage.doseAndRate) ? dosage.doseAndRate[0] : null)
          ?.doseQuantity)
      );
      if (doseQuantity) parts.push(doseQuantity);

      const route = readCodeableText(dosage.route);
      if (route) parts.push(`Route: ${route}`);

      const timing = asObject(dosage.timing);
      const repeat = asObject(timing?.repeat);
      const frequency = readString(repeat?.frequency);
      const period = readString(repeat?.period);
      const periodUnit = readString(repeat?.periodUnit);
      if (frequency && period && periodUnit) {
        parts.push(`${frequency} time(s) every ${period} ${periodUnit}`);
      }

      return parts.length ? parts.join(" · ") : null;
    })
    .filter((value): value is string => Boolean(value));
};

const indexResource = (
  map: Map<string, Record<string, unknown>>,
  resource: Record<string, unknown>,
  fullUrl?: string | null
) => {
  const id = readString(resource.id);
  const resourceType = readString(resource.resourceType);

  if (fullUrl) map.set(fullUrl, resource);
  if (id) {
    map.set(id, resource);
    map.set(`urn:uuid:${id}`, resource);
    if (resourceType) map.set(`${resourceType}/${id}`, resource);
  }
};

const buildResourceMap = (
  bundle: Record<string, unknown> | null
): Map<string, Record<string, unknown>> => {
  const map = new Map<string, Record<string, unknown>>();
  if (!bundle || !Array.isArray(bundle.entry)) return map;

  for (const entryItem of bundle.entry) {
    const entry = asObject(entryItem);
    const resource = asObject(entry?.resource);
    if (!resource) continue;

    indexResource(map, resource, readString(entry?.fullUrl));

    if (Array.isArray(resource.contained)) {
      for (const containedItem of resource.contained) {
        const contained = asObject(containedItem);
        if (contained) indexResource(map, contained);
      }
    }

    if (readString(resource.resourceType) === "Bundle") {
      const nested = buildResourceMap(resource);
      nested.forEach((nestedResource, key) => {
        if (!map.has(key)) map.set(key, nestedResource);
      });
    }
  }

  return map;
};

const resolveReference = (
  value: unknown,
  resourceMap: Map<string, Record<string, unknown>>
): Record<string, unknown> | null => {
  const reference = readString(asObject(value)?.reference);
  if (!reference) return null;
  return resourceMap.get(reference) ?? null;
};

const summarizeResource = (resource: Record<string, unknown> | null): string | null => {
  if (!resource) return null;
  const resourceType = readString(resource.resourceType);

  if (resourceType === "Condition" || resourceType === "AllergyIntolerance") {
    return readCodeableText(resource.code) || readNarrative(resource);
  }
  if (resourceType === "Observation") {
    const label = readCodeableText(resource.code) || "Observation";
    const value = readObservationValue(resource);
    return value ? `${label}: ${value}` : label;
  }
  if (resourceType === "Procedure") {
    return readCodeableText(resource.code) || readString(resource.status) || "Procedure";
  }
  if (resourceType === "DiagnosticReport") {
    return readCodeableText(resource.code) || readString(resource.conclusion) || "Diagnostic Report";
  }
  if (resourceType === "MedicationRequest") {
    return (
      readCodeableText(asObject(resource.medicationCodeableConcept)) ||
      readReferenceDisplay(resource.medicationReference) ||
      "Medication"
    );
  }
  if (resourceType === "CarePlan") {
    return readString(resource.description) || readCodeableText(resource.category) || "Care Plan";
  }
  if (resourceType === "DocumentReference") {
    return readCodeableText(resource.type) || "Document";
  }

  return sanitizeDisplayValue(
    readCodeableText(resource.code) ||
      readString(resource.description) ||
      readNarrative(resource) ||
      readString(resource.title) ||
      readString(resource.name) ||
      resourceType
  );
};

const collectBundleResources = (
  bundle: Record<string, unknown> | null
): Record<string, unknown>[] => {
  if (!bundle || !Array.isArray(bundle.entry)) return [];

  const resources: Record<string, unknown>[] = [];
  for (const entryItem of bundle.entry) {
    const resource = asObject(asObject(entryItem)?.resource);
    if (!resource) continue;
    resources.push(resource);
    if (readString(resource.resourceType) === "Bundle") {
      resources.push(...collectBundleResources(resource));
    }
    if (Array.isArray(resource.contained)) {
      for (const containedItem of resource.contained) {
        const contained = asObject(containedItem);
        if (contained) resources.push(contained);
      }
    }
  }
  return resources;
};

const getResources = (item: Record<string, unknown>): Record<string, unknown>[] =>
  collectBundleResources(asObject(item.fhirBundle));

const findByType = (
  resources: Record<string, unknown>[],
  resourceType: string
): Record<string, unknown> | null =>
  resources.find((item) => readString(item.resourceType) === resourceType) ?? null;

const filterByType = (
  resources: Record<string, unknown>[],
  resourceType: string
): Record<string, unknown>[] =>
  resources.filter((item) => readString(item.resourceType) === resourceType);

interface IDetailRowProps {
  label: string;
  value?: string | null;
}

const DetailRow = ({ label, value }: IDetailRowProps) => {
  const sanitized = sanitizeDisplayValue(value);
  if (!sanitized) return null;
  return (
    <div className="col-12 col-md-6">
      <span className="text-muted fs-12 d-block mb-1">{label}</span>
      <span className="text-dark fw-medium fs-14">{sanitized}</span>
    </div>
  );
};

interface IDetailRowFullProps {
  label: string;
  value?: string | null;
}

const DetailRowFull = ({ label, value }: IDetailRowFullProps) => {
  const sanitized = sanitizeDisplayValue(value);
  if (!sanitized) return null;
  return (
    <div className="col-12">
      <span className="text-muted fs-12 d-block mb-1">{label}</span>
      <span className="text-dark fs-14">{sanitized}</span>
    </div>
  );
};

const readFirstTelecom = (resource: Record<string, unknown> | null): string | null =>
  readTelecoms(resource)[0] ?? null;

const readFirstAddress = (resource: Record<string, unknown> | null): string | null =>
  readAddresses(resource)[0] ?? null;

const readPatientMrn = (resource: Record<string, unknown> | null): string | null => {
  const identifiers = readIdentifiers(resource);
  const mrn = identifiers.find((identifier) => /mrd|mrn|uhid|patient/i.test(identifier));
  return mrn ?? identifiers[0] ?? null;
};

interface ISimpleListItemProps {
  title: string;
  subtitle?: string | null;
  badge?: string | null;
}

const SimpleListItem = ({ title, subtitle, badge }: ISimpleListItemProps) => (
  <li className="py-2 border-bottom border-light last:border-0">
    <div className="d-flex align-items-start justify-content-between gap-2">
      <span className="text-dark fs-14">{title}</span>
      {badge ? <span className="badge badge-soft-primary text-capitalize">{badge}</span> : null}
    </div>
    {subtitle ? <span className="text-muted fs-13 d-block mt-1">{subtitle}</span> : null}
  </li>
);

interface ISectionCardProps {
  title: string;
  children: ReactNode;
}

interface IHealthHistoryAttachment {
  id: string;
  title: string;
  contentType: string;
  dataUrl: string | null;
  externalUrl: string | null;
}

const buildDataUrl = (contentType: string, base64Data: string): string => {
  const normalizedType = contentType.trim() || "application/octet-stream";
  const normalizedData = base64Data.replace(/\s/g, "");
  return `data:${normalizedType};base64,${normalizedData}`;
};

const isImageContentType = (contentType: string): boolean =>
  contentType.toLowerCase().startsWith("image/");

const isPdfContentType = (contentType: string): boolean =>
  contentType.toLowerCase().includes("pdf");

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const lookupResource = (
  reference: string,
  resourceMap: Map<string, Record<string, unknown>>
): Record<string, unknown> | null => {
  const trimmed = reference.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];
  if (trimmed.startsWith("urn:uuid:")) {
    const id = trimmed.slice("urn:uuid:".length);
    candidates.push(id, `Binary/${id}`, `DocumentReference/${id}`);
  } else if (trimmed.includes("/")) {
    const id = trimmed.split("/").pop();
    if (id) candidates.push(id, `urn:uuid:${id}`);
  } else {
    candidates.push(`urn:uuid:${trimmed}`, `Binary/${trimmed}`);
  }

  for (const key of candidates) {
    const resource = resourceMap.get(key);
    if (resource) return resource;
  }
  return null;
};

const readBinaryData = (resource: Record<string, unknown> | null): string | null => {
  if (!resource) return null;
  return readString(resource.data) || readString(resource.content);
};

const getAttachmentFilename = (title: string, contentType: string): string => {
  const lowerType = contentType.toLowerCase();
  const extension = lowerType.includes("pdf")
    ? "pdf"
    : lowerType.includes("png")
      ? "png"
      : lowerType.includes("jpeg") || lowerType.includes("jpg")
        ? "jpg"
        : lowerType.includes("gif")
          ? "gif"
          : lowerType.includes("webp")
            ? "webp"
            : "bin";
  const safeTitle =
    title
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "attachment";
  return `${safeTitle}.${extension}`;
};

const mapAttachmentObject = (
  attachment: Record<string, unknown> | null,
  fallbackTitle: string,
  index: number,
  idPrefix: string,
  resourceMap?: Map<string, Record<string, unknown>>
): IHealthHistoryAttachment | null => {
  if (!attachment) return null;

  let contentType = readString(attachment.contentType) || "application/octet-stream";
  let base64Data = readString(attachment.data);
  const referencedUrl = readString(attachment.url);
  const title =
    readString(attachment.title) || fallbackTitle || `Attachment ${index + 1}`;

  if (!base64Data && referencedUrl && resourceMap) {
    const referenced = lookupResource(referencedUrl, resourceMap);
    if (referenced) {
      const binaryData = readBinaryData(referenced);
      if (binaryData) {
        base64Data = binaryData;
        contentType =
          readString(referenced.contentType) ||
          readString(asObject(referenced.content)?.contentType) ||
          contentType;
      }
    }
  }

  const externalUrl =
    referencedUrl && isHttpUrl(referencedUrl) ? referencedUrl : null;

  if (!base64Data && !externalUrl) return null;

  return {
    id: `${idPrefix}-${index}`,
    title,
    contentType,
    dataUrl: base64Data ? buildDataUrl(contentType, base64Data) : null,
    externalUrl,
  };
};

const pushIfAttachment = (
  list: IHealthHistoryAttachment[],
  attachment: IHealthHistoryAttachment | null
) => {
  if (attachment) list.push(attachment);
};

const extractAttachmentsFromResources = (
  resources: Record<string, unknown>[],
  resourceMap: Map<string, Record<string, unknown>>
): IHealthHistoryAttachment[] => {
  const attachments: IHealthHistoryAttachment[] = [];
  const referencedBinaryIds = new Set<string>();

  for (const resource of resources) {
    const resourceType = readString(resource.resourceType);
    const resourceId = readString(resource.id) || resourceType || "attachment";

    if (resourceType === "DocumentReference" && Array.isArray(resource.content)) {
      const docTitle =
        readString(resource.description) ||
        readCodeableText(resource.type) ||
        "Prescription";
      resource.content.forEach((contentItem, index) => {
        const attachmentObj = asObject(asObject(contentItem)?.attachment);
        const referencedUrl = readString(attachmentObj?.url);
        if (referencedUrl) {
          const referenced = lookupResource(referencedUrl, resourceMap);
          const referencedId = readString(referenced?.id);
          if (referencedId) referencedBinaryIds.add(referencedId);
        }
        pushIfAttachment(
          attachments,
          mapAttachmentObject(attachmentObj, docTitle, index, resourceId, resourceMap)
        );
      });
      continue;
    }

    if (resourceType === "DiagnosticReport") {
      const reportTitle = readCodeableText(resource.code) || "Diagnostic Report";
      if (Array.isArray(resource.presentedForm)) {
        resource.presentedForm.forEach((formItem, index) => {
          pushIfAttachment(
            attachments,
            mapAttachmentObject(
              asObject(formItem),
              reportTitle,
              index,
              resourceId,
              resourceMap
            )
          );
        });
      }
      continue;
    }

    if (resourceType === "Media") {
      pushIfAttachment(
        attachments,
        mapAttachmentObject(
          asObject(resource.content),
          readCodeableText(resource.type) || "Media",
          0,
          resourceId,
          resourceMap
        )
      );
      continue;
    }

    if (resourceType === "Observation") {
      pushIfAttachment(
        attachments,
        mapAttachmentObject(
          asObject(resource.valueAttachment),
          readCodeableText(resource.code) || "Observation",
          0,
          resourceId,
          resourceMap
        )
      );
    }
  }

  for (const resource of resources) {
    if (readString(resource.resourceType) !== "Binary") continue;
    const resourceId = readString(resource.id);
    if (resourceId && referencedBinaryIds.has(resourceId)) continue;

    const binaryData = readBinaryData(resource);
    if (!binaryData) continue;

    const contentType = readString(resource.contentType) || "application/octet-stream";
    const isDocument =
      isPdfContentType(contentType) ||
      isImageContentType(contentType) ||
      contentType.toLowerCase() === "application/octet-stream";
    if (!isDocument) continue;

    attachments.push({
      id: `binary-${resourceId || attachments.length}`,
      title: isPdfContentType(contentType) ? "Prescription PDF" : "Attachment",
      contentType,
      dataUrl: buildDataUrl(contentType, binaryData),
      externalUrl: null,
    });
  }

  return attachments;
};

const extractRootAttachments = (
  item: Record<string, unknown>
): IHealthHistoryAttachment[] => {
  if (!Array.isArray(item.attachments)) return [];

  return item.attachments
    .map((attachmentItem, index) =>
      mapAttachmentObject(
        asObject(attachmentItem),
        readString(asObject(attachmentItem)?.title) || `Attachment ${index + 1}`,
        index,
        "root"
      )
    )
    .filter((attachment): attachment is IHealthHistoryAttachment => Boolean(attachment));
};

interface IAttachmentPreviewProps {
  attachment: IHealthHistoryAttachment;
}

const AttachmentPreview = ({ attachment }: IAttachmentPreviewProps) => {
  const href = attachment.dataUrl ?? attachment.externalUrl;
  if (!href) return null;

  const isImage = isImageContentType(attachment.contentType);
  const isPdf = isPdfContentType(attachment.contentType);
  const downloadName = getAttachmentFilename(attachment.title, attachment.contentType);

  return (
    <div className="border rounded-3 p-3 mb-2 last:mb-0">
      <div className="d-flex align-items-start justify-content-between gap-2 mb-2 flex-wrap">
        <span className="text-dark fw-medium fs-14">{attachment.title}</span>
        <span className="badge bg-light text-dark text-uppercase">{attachment.contentType}</span>
      </div>

      {isImage ? (
        <div className="bg-light rounded border p-2 mb-2 text-center">
          <img
            src={href}
            alt={attachment.title}
            className="img-fluid rounded w-100 h-auto"
            style={{ maxHeight: "min(400px, 60vh)", objectFit: "contain" }}
          />
        </div>
      ) : null}

      {isPdf ? (
        <div className="bg-light rounded border mb-2 overflow-hidden">
          <iframe
            src={href}
            title={attachment.title}
            className="w-100 border-0"
            style={{ minHeight: "min(480px, 60vh)" }}
          />
        </div>
      ) : null}

      {attachment.dataUrl ? (
        <a
          href={attachment.dataUrl}
          download={downloadName}
          className="btn btn-sm btn-outline-secondary"
        >
          <i className="ti ti-download me-1" />
          Download
        </a>
      ) : null}
    </div>
  );
};

const SectionCard = ({ title, children }: ISectionCardProps) => (
  <div className="border rounded-3 mb-3 overflow-hidden">
    <div className="bg-light px-3 py-2 border-bottom">
      <h6 className="fw-bold mb-0 text-dark fs-14">{title}</h6>
    </div>
    <div className="p-3">{children}</div>
  </div>
);

const HealthHistoryDetailModal = ({
  open,
  onClose,
  item,
  title = "Health History Details",
}: IHealthHistoryDetailModalProps) => {
  const resources = useMemo(
    () => (item ? getResources(item) : []),
    [item]
  );

  const fhirBundle = asObject(item?.fhirBundle);
  const resourceMap = useMemo(() => buildResourceMap(fhirBundle), [fhirBundle]);

  const attachments = useMemo(() => {
    if (!item) return [];
    const fromResources = extractAttachmentsFromResources(resources, resourceMap);
    const fromRoot = extractRootAttachments(item);
    const seen = new Set<string>();
    return [...fromResources, ...fromRoot].filter((attachment) => {
      const key = `${attachment.title}-${attachment.contentType}-${attachment.dataUrl?.slice(0, 32) ?? attachment.externalUrl ?? attachment.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [item, resources, resourceMap]);

  if (!open || !item) return null;
  const composition = findByType(resources, "Composition");
  const patient = findByType(resources, "Patient");
  const practitioner = findByType(resources, "Practitioner");
  const organization = findByType(resources, "Organization");
  const encounter = findByType(resources, "Encounter");
  const carePlans = filterByType(resources, "CarePlan");
  const conditions = filterByType(resources, "Condition");
  const allergies = filterByType(resources, "AllergyIntolerance");
  const observations = filterByType(resources, "Observation");
  const familyHistory = filterByType(resources, "FamilyMemberHistory");
  const medications = filterByType(resources, "MedicationRequest");
  const procedures = filterByType(resources, "Procedure");
  const diagnosticReports = filterByType(resources, "DiagnosticReport");

  const compositionSections = Array.isArray(composition?.section)
    ? composition.section
        .map((sectionItem, index) => {
          const section = asObject(sectionItem);
          if (!section) return null;
          const sectionTitle =
            readString(section.title) || readCodeableText(section.code) || `Section ${index + 1}`;
          const narrative = readNarrative(section);
          const entries = Array.isArray(section.entry)
            ? section.entry
                .map((entryItem) => summarizeResource(resolveReference(entryItem, resourceMap)))
                .map((entry) => sanitizeDisplayValue(entry))
                .filter((value): value is string => Boolean(value))
            : [];
          if (!narrative && !entries.length) return null;
          return { id: readString(section.id) || `section-${index}`, title: sectionTitle, narrative, entries };
        })
        .filter(
          (
            section
          ): section is {
            id: string;
            title: string;
            narrative: string | null;
            entries: string[];
          } => Boolean(section)
        )
    : [];

  const documentTitle =
    readString(composition?.title) ||
    readCodeableText(composition?.type) ||
    title;
  const documentType = readCodeableText(composition?.type);
  const documentDate =
    readString(composition?.date) ||
    readString(fhirBundle?.timestamp) ||
    readString(asObject(fhirBundle?.meta)?.lastUpdated);

  const patientName = readHumanName(patient);
  const patientBirthDate = readString(patient?.birthDate);
  const patientGender = readString(patient?.gender);
  const patientMrn = readPatientMrn(patient);
  const patientPhone = readFirstTelecom(patient);
  const patientAddress = readFirstAddress(patient);

  const practitionerName = readHumanName(practitioner);

  const encounterPeriod = asObject(encounter?.period);
  const encounterStart = readString(encounterPeriod?.start);
  const encounterEnd = readString(encounterPeriod?.end);
  const hospitalization = asObject(encounter?.hospitalization);
  const dischargeDisposition = readCodeableText(hospitalization?.dischargeDisposition);
  const admitSource = readCodeableText(hospitalization?.admitSource);
  const encounterReason = Array.isArray(encounter?.reasonCode)
    ? encounter.reasonCode
        .map((item) => readCodeableText(item))
        .filter((value): value is string => Boolean(value))
    : [];

  const documentSummary = readNarrative(composition);

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
        aria-labelledby="health_history_detail_title"
      >
        <div className="offcanvas-header border-bottom flex-shrink-0">
          <div>
            <h5 id="health_history_detail_title" className="offcanvas-title fw-bold text-dark mb-1">
              {documentTitle}
            </h5>
            {documentType && documentType !== documentTitle ? (
              <span className="text-muted fs-13">{documentType}</span>
            ) : null}
            {documentDate ? (
              <span className="text-muted fs-13 d-block mt-1">{formatDate(documentDate)}</span>
            ) : null}
          </div>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>

        <div className="offcanvas-body overflow-auto flex-grow-1">
          {documentSummary ? (
            <SectionCard title="Summary">
              <p className="text-dark fs-14 mb-0">{documentSummary}</p>
            </SectionCard>
          ) : null}

          {compositionSections.length > 0 ? (
            <SectionCard title="Clinical Sections">
              {compositionSections.map((section) => (
                <div key={section.id} className="border rounded-3 p-3 mb-2 last:mb-0">
                  <h6 className="fw-semibold text-dark fs-14 mb-2">{section.title}</h6>
                  {section.narrative ? (
                    <p className="text-dark fs-14 mb-2">{section.narrative}</p>
                  ) : null}
                  {section.entries.length ? (
                    <ul className="list-unstyled mb-0">
                      {section.entries.map((entry, index) => (
                        <li key={`${section.id}-entry-${index}`} className="text-dark fs-14 py-1 border-top border-light">
                          {entry}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </SectionCard>
          ) : null}

          {(patientName || patientBirthDate || patientGender || patientMrn || patientPhone || patientAddress) && (
            <SectionCard title="Patient">
              <div className="row g-3">
                <DetailRow label="Name" value={patientName} />
                <DetailRow label="MRD / UHID" value={patientMrn} />
                <DetailRow label="Birth Date" value={formatDateShort(patientBirthDate)} />
                <DetailRow label="Gender" value={patientGender} />
                <DetailRow label="Phone" value={patientPhone} />
                <DetailRowFull label="Address" value={patientAddress} />
              </div>
            </SectionCard>
          )}

          {(practitionerName || readString(organization?.name)) && (
            <SectionCard title="Care Team">
              <div className="row g-3">
                <DetailRow label="Doctor" value={practitionerName} />
                <DetailRow label="Department / Hospital" value={readString(organization?.name)} />
              </div>
            </SectionCard>
          )}

          {encounter ? (
            <SectionCard title="Visit / Admission">
              <div className="row g-3">
                <DetailRow
                  label="Period"
                  value={
                    encounterStart || encounterEnd
                      ? `${encounterStart ? formatDateShort(encounterStart) : "—"} – ${encounterEnd ? formatDateShort(encounterEnd) : "—"}`
                      : null
                  }
                />
                <DetailRow label="Admit Source" value={admitSource} />
                <DetailRow label="Discharge Disposition" value={dischargeDisposition} />
                {encounterReason.length ? (
                  <DetailRowFull label="Reason for Visit" value={encounterReason.join(", ")} />
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          {conditions.length > 0 ? (
            <SectionCard title="Conditions / Complaints">
              <ul className="list-unstyled mb-0">
                {conditions.map((condition, index) => {
                  const conditionTitle =
                    readCodeableText(condition.code) ||
                    readNarrative(condition) ||
                    "Condition";
                  const notes = readNotes(condition).join("; ");
                  const severity = readCodeableText(condition.severity);
                  return (
                    <SimpleListItem
                      key={readString(condition.id) || `condition-${index}`}
                      title={conditionTitle}
                      subtitle={notes || null}
                      badge={severity}
                    />
                  );
                })}
              </ul>
            </SectionCard>
          ) : null}

          {allergies.length > 0 ? (
            <SectionCard title="Allergies">
              <ul className="list-unstyled mb-0">
                {allergies.map((allergy, index) => {
                  const reactions = Array.isArray(allergy.reaction)
                    ? allergy.reaction
                        .map((item) => {
                          const reaction = asObject(item);
                          return (
                            readCodeableText(reaction?.manifestation) ||
                            readString(reaction?.description)
                          );
                        })
                        .filter((value): value is string => Boolean(value))
                        .join(", ")
                    : "";
                  const notes = [reactions, readNotes(allergy).join("; ")].filter(Boolean).join(" · ");
                  return (
                    <SimpleListItem
                      key={readString(allergy.id) || `allergy-${index}`}
                      title={readCodeableText(allergy.code) || "Allergy"}
                      subtitle={notes || null}
                      badge={readString(allergy.criticality)}
                    />
                  );
                })}
              </ul>
            </SectionCard>
          ) : null}

          {observations.length > 0 ? (
            <SectionCard title="Observations / Vitals">
              <ul className="list-unstyled mb-0">
                {observations.map((observation, index) => {
                  const label = readCodeableText(observation.code) || "Observation";
                  const value = readObservationValue(observation) || "—";
                  const referenceRange = Array.isArray(observation.referenceRange)
                    ? observation.referenceRange
                        .map((item) => {
                          const range = asObject(item);
                          const low = readQuantityValue(range?.low);
                          const high = readQuantityValue(range?.high);
                          const text = readString(range?.text);
                          return text || [low, high].filter(Boolean).join(" – ");
                        })
                        .filter(Boolean)
                        .join("; ")
                    : "";
                  const interpretation = readCodeableText(observation.interpretation);
                  const subtitle = [referenceRange ? `Ref: ${referenceRange}` : null, interpretation]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <SimpleListItem
                      key={readString(observation.id) || `observation-${index}`}
                      title={`${label}: ${value}`}
                      subtitle={subtitle || null}
                    />
                  );
                })}
              </ul>
            </SectionCard>
          ) : null}

          {diagnosticReports.length > 0 ? (
            <SectionCard title="Investigations">
              {diagnosticReports.map((report, index) => {
                const reportTitle = readCodeableText(report.code) || "Investigation";
                const conclusion = readString(report.conclusion);
                const results = Array.isArray(report.result)
                  ? report.result
                      .map((item) => summarizeResource(resolveReference(item, resourceMap)))
                      .map((entry) => sanitizeDisplayValue(entry))
                      .filter((value): value is string => Boolean(value))
                  : [];
                return (
                  <div key={readString(report.id) || `report-${index}`} className="border rounded-3 p-3 mb-2 last:mb-0">
                    <h6 className="fw-semibold text-dark fs-14 mb-2">{reportTitle}</h6>
                    {conclusion ? <p className="text-dark fs-14 mb-2">{conclusion}</p> : null}
                    {results.length ? (
                      <ul className="list-unstyled mb-0">
                        {results.map((result, resultIndex) => (
                          <li key={`${reportTitle}-result-${resultIndex}`} className="text-dark fs-14 py-1 border-top border-light">
                            {result}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </SectionCard>
          ) : null}

          {procedures.length > 0 ? (
            <SectionCard title="Procedures">
              <ul className="list-unstyled mb-0">
                {procedures.map((procedure, index) => {
                  const procedureTitle = readCodeableText(procedure.code) || "Procedure";
                  const performed = formatDate(
                    readString(procedure.performedDateTime) || readString(procedure.performedPeriod)
                  );
                  const outcome = readCodeableText(procedure.outcome);
                  const notes = readNotes(procedure).join("; ") || readNarrative(procedure);
                  const subtitle = [performed !== "—" ? performed : null, outcome, notes]
                    .filter((value) => value && value !== "—")
                    .join(" · ");
                  return (
                    <SimpleListItem
                      key={readString(procedure.id) || `procedure-${index}`}
                      title={procedureTitle}
                      subtitle={subtitle || null}
                    />
                  );
                })}
              </ul>
            </SectionCard>
          ) : null}

          {medications.length > 0 ? (
            <SectionCard title="Medications">
              <ul className="list-unstyled mb-0">
                {medications.map((medication, index) => {
                  const medTitle =
                    readCodeableText(asObject(medication.medicationCodeableConcept)) ||
                    readReferenceDisplay(medication.medicationReference) ||
                    "Medication";
                  const dosage = readDosageInstructions(medication).join("; ");
                  const notes = readNotes(medication).join("; ");
                  const subtitle = [dosage, notes].filter(Boolean).join(" · ");
                  return (
                    <SimpleListItem
                      key={readString(medication.id) || `med-${index}`}
                      title={medTitle}
                      subtitle={subtitle || null}
                    />
                  );
                })}
              </ul>
            </SectionCard>
          ) : null}

          {familyHistory.length > 0 ? (
            <SectionCard title="Family History">
              <ul className="list-unstyled mb-0">
                {familyHistory.map((history, index) => {
                  const relationship = readCodeableText(history.relationship) || "Family member";
                  const conditionsList = Array.isArray(history.condition)
                    ? history.condition
                        .map((item) => readCodeableText(asObject(item)?.code))
                        .filter((value): value is string => Boolean(value))
                        .join(", ")
                    : "";
                  const notes = readNotes(history).join("; ");
                  const subtitle = [conditionsList, notes].filter(Boolean).join(" · ");
                  return (
                    <SimpleListItem
                      key={readString(history.id) || `family-${index}`}
                      title={relationship}
                      subtitle={subtitle || null}
                    />
                  );
                })}
              </ul>
            </SectionCard>
          ) : null}

          {carePlans.length > 0 ? (
            <SectionCard title="Advice / Care Plan">
              <ul className="list-unstyled mb-0">
                {carePlans.map((plan, index) => {
                  const advice =
                    readString(plan.description) ||
                    (Array.isArray(plan.activity)
                      ? plan.activity
                          .map((item) => {
                            const activity = asObject(item);
                            return (
                              readString(asObject(activity?.detail)?.description) ||
                              readCodeableText(asObject(activity?.detail)?.code)
                            );
                          })
                          .filter((value): value is string => Boolean(value))
                          .join("; ")
                      : "") ||
                    readNotes(plan).join("; ");
                  return advice ? (
                    <SimpleListItem
                      key={readString(plan.id) || `careplan-${index}`}
                      title={advice}
                    />
                  ) : null;
                })}
              </ul>
            </SectionCard>
          ) : null}

          {attachments.length > 0 ? (
            <SectionCard title="Attachments">
              {attachments.map((attachment) => (
                <AttachmentPreview key={attachment.id} attachment={attachment} />
              ))}
            </SectionCard>
          ) : null}

          {!resources.length ? (
            <p className="text-muted mb-0">No structured health record details available.</p>
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

export default HealthHistoryDetailModal;
