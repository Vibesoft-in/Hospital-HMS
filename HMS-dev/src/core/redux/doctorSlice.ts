import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface IDoctorUpdatePayload {
  doctorId?: string;
  imageUrl?: string;
  doctorData?: any;
}

interface DoctorState {
  lastUpdated: number;
  updatedDoctorId: string | null;
  updatedDoctorData: any | null;
}

const initialState: DoctorState = {
  lastUpdated: 0,
  updatedDoctorId: null,
  updatedDoctorData: null,
};

const doctorSlice = createSlice({
  name: "doctor",
  initialState,
  reducers: {
    invalidateDoctorCache: (
      state,
      action: PayloadAction<IDoctorUpdatePayload | undefined>
    ) => {
      state.lastUpdated = Date.now();
      state.updatedDoctorId = action.payload?.doctorId || null;
      state.updatedDoctorData = action.payload?.doctorData || null;
    },
  },
});

export const { invalidateDoctorCache } = doctorSlice.actions;
export default doctorSlice.reducer;
