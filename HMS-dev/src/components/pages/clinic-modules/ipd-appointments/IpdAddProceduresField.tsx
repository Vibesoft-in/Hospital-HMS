"use client";

import CommonSelect, { Option } from "@/core/common/common-select/commonSelect";
import IpdProceduresTable, {
  type IIpdProcedureRow,
} from "@/components/pages/clinic-modules/ipd-appointments/IpdProceduresTable";

interface IIpdAddProceduresFieldProps {
  proceduresOptions: Option[];
  addProcedureSelect: Option | null;
  onAddProcedure: (option: Option | null) => void;
  proceduresLoading: boolean;
  procedures: IIpdProcedureRow[];
  onIncrementUnits: (id: string) => void;
  onDecrementUnits: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleCompleted: (id: string, isCompleted: boolean) => void;
}

const IpdAddProceduresField = ({
  proceduresOptions,
  addProcedureSelect,
  onAddProcedure,
  proceduresLoading,
  procedures,
  onIncrementUnits,
  onDecrementUnits,
  onRemove,
  onToggleCompleted,
}: IIpdAddProceduresFieldProps) => {
  return (
    <>
      <div className="col-12">
        <label className="form-label mb-1 fw-medium fs-14">Add Procedures</label>
        <CommonSelect
          options={proceduresOptions}
          value={addProcedureSelect}
          onChange={onAddProcedure}
          placeholder="Select procedure to add..."
          isLoading={proceduresLoading}
        />
      </div>
      <div className="col-12">
        <IpdProceduresTable
          procedures={procedures}
          onIncrementUnits={onIncrementUnits}
          onDecrementUnits={onDecrementUnits}
          onRemove={onRemove}
          onToggleCompleted={onToggleCompleted}
        />
      </div>
    </>
  );
};

export default IpdAddProceduresField;
