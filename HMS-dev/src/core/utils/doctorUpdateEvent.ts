import store from "@/core/redux/store";
import { invalidateDoctorCache, IDoctorUpdatePayload } from "@/core/redux/doctorSlice";

/**
 * Broadcasts doctor update across the app without needing a full page reload:
 * 1. Dispatches Redux invalidateDoctorCache action
 * 2. Emits a custom window event "doctor-updated" with payload details
 */
export const broadcastDoctorUpdate = (payload: IDoctorUpdatePayload) => {
  try {
    store.dispatch(invalidateDoctorCache(payload));
  } catch (err) {
    console.warn("Failed to dispatch invalidateDoctorCache to Redux:", err);
  }

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("doctor-updated", {
          detail: payload,
        })
      );
    } catch (err) {
      console.warn("Failed to dispatch doctor-updated window event:", err);
    }

    try {
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("hms_doctor_updates");
        bc.postMessage(payload);
        bc.close();
      }
    } catch {
      // BroadcastChannel optional fallback
    }

    try {
      localStorage.setItem(
        "hms_last_doctor_update",
        JSON.stringify({ ...payload, _t: Date.now() })
      );
    } catch {
      // localStorage optional fallback
    }
  }
};
