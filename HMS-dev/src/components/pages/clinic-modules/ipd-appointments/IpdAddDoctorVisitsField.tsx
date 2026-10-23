"use client";

import CommonSelect, { Option } from "@/core/common/common-select/commonSelect";
import IpdDoctorVisitsTable from "@/components/pages/clinic-modules/ipd-appointments/IpdDoctorVisitsTable";
import type { IIpdDoctorVisitRow } from "@/components/pages/clinic-modules/ipd-appointments/ipdDoctorVisitRows";

interface IIpdAddDoctorVisitsFieldProps {
  doctorOptions: Option[];
  addDoctorSelect: Option | null;
  onAddDoctor: (option: Option | null) => void;
  doctorsLoading: boolean;
  visits: IIpdDoctorVisitRow[];
  onIncrementDays: (doctorId: string) => void;
  onDecrementDays: (doctorId: string) => void;
  onRemove: (doctorId: string) => void;
}

const IpdAddDoctorVisitsField = ({
  doctorOptions,
  addDoctorSelect,
  onAddDoctor,
  doctorsLoading,
  visits,
  onIncrementDays,
  onDecrementDays,
  onRemove,
}: IIpdAddDoctorVisitsFieldProps) => {
  return (
    <>
      <div className="col-12">
        <label className="form-label mb-1 fw-medium fs-14">Add Visiting Doctor</label>
        <CommonSelect
          options={doctorOptions}
          value={addDoctorSelect}
          onChange={onAddDoctor}
          placeholder="Select doctor to add..."
          isLoading={doctorsLoading}
        />
      </div>
      <div className="col-12">
        <IpdDoctorVisitsTable
          visits={visits}
          onIncrementDays={onIncrementDays}
          onDecrementDays={onDecrementDays}
          onRemove={onRemove}
        />
      </div>
    </>
  );
};

export default IpdAddDoctorVisitsField;
