import axios from "axios";
import { API_BASE_URL } from "@/environment";

export const uploadFileToS3 = async (file: File, folder: string): Promise<string> => {
  if (!file) return "";
  if (!API_BASE_URL) {
    console.warn("API_BASE_URL not configured for file upload, converting to data URL.");
    return readFileAsDataUrl(file);
  }

  const formData = new FormData();
  formData.append("file", file);

  // 1. Try primary hospital upload route
  try {
    const res = await axios.post(`${API_BASE_URL}/upload/hospital?folder=${folder}`, formData);
    const d = res.data;
    const signedUrl = d?.data?.signedUrl || "";
    if (signedUrl) return signedUrl.split("?")[0];
    const url = d?.data?.originalUrl || d?.data?.url || d?.url || "";
    if (url) return url;
  } catch (errHospital) {
    // 2. Try legacy pathlab upload route
    try {
      const res = await axios.post(`${API_BASE_URL}/upload/pathlab?folder=${folder}`, formData);
      const d = res.data;
      const signedUrl = d?.data?.signedUrl || "";
      if (signedUrl) return signedUrl.split("?")[0];
      const url = d?.data?.originalUrl || d?.data?.url || d?.url || "";
      if (url) return url;
    } catch (errPathlab) {
      console.warn("Upload service unavailable, falling back to embedded Data URL:", errHospital, errPathlab);
    }
  }

  // 3. Fallback: Base64 data URL so doctor creation / update never fails with 500 error
  return readFileAsDataUrl(file);
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve((reader.result as string) || "");
      };
      reader.onerror = () => {
        resolve("");
      };
      reader.readAsDataURL(file);
    } catch {
      resolve("");
    }
  });
}
