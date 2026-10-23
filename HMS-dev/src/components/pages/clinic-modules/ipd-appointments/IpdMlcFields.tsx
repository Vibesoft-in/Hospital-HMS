"use client";

export interface IIpdMlcData {
  markOfIdentification: string;
  thanaName: string;
  patientBroughtBy: string;
  placeOfAccident: string;
}

export const emptyIpdMlcData = (): IIpdMlcData => ({
  markOfIdentification: "",
  thanaName: "",
  patientBroughtBy: "",
  placeOfAccident: "",
});

interface IIpdMlcFieldsProps {
  value: IIpdMlcData;
  onChange: (next: IIpdMlcData) => void;
  idPrefix?: string;
}

const IpdMlcFields = ({ value, onChange, idPrefix = "ipd-mlc" }: IIpdMlcFieldsProps) => {
  const patch = (field: keyof IIpdMlcData, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="col-12">
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor={`${idPrefix}-mark`} className="form-label mb-1 fw-medium fs-14">
            Mark of Identification
          </label>
          <input
            id={`${idPrefix}-mark`}
            type="text"
            className="form-control"
            placeholder="e.g. Scar on left arm"
            value={value.markOfIdentification}
            onChange={(e) => patch("markOfIdentification", e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label htmlFor={`${idPrefix}-thana`} className="form-label mb-1 fw-medium fs-14">
            Thana Name
          </label>
          <input
            id={`${idPrefix}-thana`}
            type="text"
            className="form-control"
            placeholder="Police station name"
            value={value.thanaName}
            onChange={(e) => patch("thanaName", e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label htmlFor={`${idPrefix}-brought-by`} className="form-label mb-1 fw-medium fs-14">
            Patient Brought By
          </label>
          <input
            id={`${idPrefix}-brought-by`}
            type="text"
            className="form-control"
            placeholder="e.g. Police, Ambulance"
            value={value.patientBroughtBy}
            onChange={(e) => patch("patientBroughtBy", e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label htmlFor={`${idPrefix}-place`} className="form-label mb-1 fw-medium fs-14">
            Place of Accident
          </label>
          <input
            id={`${idPrefix}-place`}
            type="text"
            className="form-control"
            placeholder="Location of incident"
            value={value.placeOfAccident}
            onChange={(e) => patch("placeOfAccident", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default IpdMlcFields;
