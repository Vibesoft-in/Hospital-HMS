interface ILinkAbhaFieldsProps {
  enabled: boolean;
  onEnabledChange: (checked: boolean) => void;
  abhaAddress: string;
  onAbhaAddressChange: (value: string) => void;
  abhaNumber: string;
  onAbhaNumberChange: (value: string) => void;
  idPrefix: string;
}

const LinkAbhaFields = ({
  enabled,
  onEnabledChange,
  abhaAddress,
  onAbhaAddressChange,
  abhaNumber,
  onAbhaNumberChange,
  idPrefix,
}: ILinkAbhaFieldsProps) => {
  const toggleId = `${idPrefix}-link-abha-toggle`;

  return (
    <div className="col-12">
      <div className="border rounded p-3 bg-light">
        <div className="d-flex align-items-center gap-2 flex-wrap mb-0">
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id={toggleId}
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              aria-label="Link ABHA"
            />
            <label className="form-check-label fw-medium fs-14" htmlFor={toggleId}>
              Link ABHA
            </label>
          </div>
        </div>
        {enabled ? (
          <div className="row g-3 mt-2">
            <div className="col-12 col-md-6">
              <label className="form-label mb-1 fw-medium fs-14" htmlFor={`${idPrefix}-abha-address`}>
                ABHA Address <span className="text-danger">*</span>
              </label>
              <input
                id={`${idPrefix}-abha-address`}
                type="text"
                className="form-control"
                placeholder="e.g. name@sbx"
                value={abhaAddress}
                onChange={(e) => onAbhaAddressChange(e.target.value)}
                required={enabled}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label mb-1 fw-medium fs-14" htmlFor={`${idPrefix}-abha-number`}>
                ABHA Number <span className="text-danger">*</span>
              </label>
              <input
                id={`${idPrefix}-abha-number`}
                type="text"
                className="form-control"
                placeholder="Enter ABHA number"
                value={abhaNumber}
                onChange={(e) => onAbhaNumberChange(e.target.value)}
                required={enabled}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LinkAbhaFields;
