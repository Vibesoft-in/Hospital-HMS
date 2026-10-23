"use client";

export interface IIpdProcedureRow {
  id: string;
  name: string;
  price: number;
  units: number;
  category?: string;
  isCompleted?: boolean;
}

interface IpdProceduresTableProps {
  procedures: IIpdProcedureRow[];
  onIncrementUnits: (id: string) => void;
  onDecrementUnits: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleCompleted: (id: string, isCompleted: boolean) => void;
}

const IpdProceduresTable = ({
  procedures,
  onIncrementUnits,
  onDecrementUnits,
  onRemove,
  onToggleCompleted,
}: IpdProceduresTableProps) => {
  return (
    <div className="border rounded overflow-hidden">
      <div
        className="d-flex border-bottom bg-light px-2 py-1 fw-medium text-dark"
        style={{ fontSize: "0.95rem" }}
      >
        <span className="col-1 text-nowrap">S.No</span>
        <span className="col text-nowrap ps-3">Procedure</span>
        <span className="col-2 text-center text-nowrap">Completed</span>
        <span className="col-3 text-center text-nowrap">Units</span>
        <span className="col text-end pe-4 text-nowrap">Price</span>
      </div>
      <div
        className="text-dark"
        style={{ maxHeight: "170px", overflowY: "auto", fontSize: "0.95rem" }}
      >
        {procedures.length === 0 ? (
          <div className="px-2 py-3 text-center">No procedures added</div>
        ) : (
          procedures.map((proc, idx) => (
            <div
              key={proc.id}
              className="d-flex align-items-center border-bottom px-2 py-2"
            >
              <span className="col-1">{idx + 1}</span>
              <span className="col ps-3">{proc.name}</span>
              <span className="col-2 d-flex align-items-center justify-content-center">
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id={`ipd-proc-done-${proc.id}`}
                    checked={Boolean(proc.isCompleted)}
                    onChange={(e) => onToggleCompleted(proc.id, e.target.checked)}
                    aria-label={`Mark ${proc.name} as completed`}
                  />
                </div>
              </span>
              <span className="col-3 d-flex align-items-center justify-content-center gap-1">
                <button
                  type="button"
                  className="btn btn-sm btn-light border px-2 py-0"
                  aria-label={`Decrease units for ${proc.name}`}
                  onClick={() => onDecrementUnits(proc.id)}
                >
                  <i className="ti ti-minus fs-14" />
                </button>
                <span className="fw-semibold text-center" style={{ minWidth: "1.5rem" }}>
                  {proc.units}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-light border px-2 py-0"
                  aria-label={`Increase units for ${proc.name}`}
                  onClick={() => onIncrementUnits(proc.id)}
                >
                  <i className="ti ti-plus fs-14" />
                </button>
              </span>
              <span className="col d-flex align-items-center justify-content-end gap-1">
                <span>₹{(proc.price * proc.units).toFixed(2)}</span>
                <button
                  type="button"
                  className="btn btn-link p-0 text-danger min-w-0"
                  aria-label={`Remove ${proc.name}`}
                  onClick={() => onRemove(proc.id)}
                >
                  <i className="ti ti-trash ps-1 fs-16" />
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default IpdProceduresTable;
