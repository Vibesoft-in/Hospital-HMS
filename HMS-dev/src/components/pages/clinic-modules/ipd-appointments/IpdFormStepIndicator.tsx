"use client";

interface IIpdFormStepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const stepCircleClass = (current: number, step: number): string => {
  if (current === step) return "bg-primary text-white";
  if (current > step) return "bg-success text-white";
  return "bg-light border text-muted";
};

const stepLabelClass = (current: number, step: number): string => {
  if (current === step) return "fw-semibold fs-14 text-primary d-none d-sm-inline";
  return "fw-semibold fs-14 text-muted d-none d-sm-inline";
};

const IpdFormStepIndicator = ({ currentStep }: IIpdFormStepIndicatorProps) => {
  return (
    <div className="mb-3 pb-3 border-bottom">
      <div className="d-flex align-items-center justify-content-center gap-0">
        <div className="d-flex align-items-center gap-2">
          <div
            className={`d-inline-flex align-items-center justify-content-center rounded-circle fw-bold fs-13 ${stepCircleClass(currentStep, 1)}`}
            style={{ width: 32, height: 32, flexShrink: 0 }}
          >
            {currentStep > 1 ? <i className="ti ti-check fs-14" /> : "1"}
          </div>
          <span className={stepLabelClass(currentStep, 1)}>Patient Details</span>
        </div>
        <div
          className="flex-grow-1 mx-2"
          style={{
            height: 2,
            maxWidth: 60,
            background: currentStep > 1 ? "#dee2e6" : "#dee2e6",
            borderRadius: 2,
          }}
        />
        <div className="d-flex align-items-center gap-2">
          <div
            className={`d-inline-flex align-items-center justify-content-center rounded-circle fw-bold fs-13 ${stepCircleClass(currentStep, 2)}`}
            style={{ width: 32, height: 32, flexShrink: 0 }}
          >
            {currentStep > 2 ? <i className="ti ti-check fs-14" /> : "2"}
          </div>
          <span className={stepLabelClass(currentStep, 2)}>IPD Details</span>
        </div>
        <div
          className="flex-grow-1 mx-2"
          style={{
            height: 2,
            maxWidth: 60,
            background: "#dee2e6",
            borderRadius: 2,
          }}
        />
        <div className="d-flex align-items-center gap-2">
          <div
            className={`d-inline-flex align-items-center justify-content-center rounded-circle fw-bold fs-13 ${stepCircleClass(currentStep, 3)}`}
            style={{ width: 32, height: 32, flexShrink: 0 }}
          >
            3
          </div>
          <span className={stepLabelClass(currentStep, 3)}>Bed Details</span>
        </div>
      </div>
    </div>
  );
};

export default IpdFormStepIndicator;
