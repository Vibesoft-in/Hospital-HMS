import axios from "axios";
import { API_BASE_URL } from "@/environment";

export const uploadFileToS3 = async (file: File, folder: string): Promise<string> => {
  if (!API_BASE_URL) {
    throw new Error("API configuration error");
  }

  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(`${API_BASE_URL}/upload/pathlab?folder=${folder}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const d = res.data;
  const signedUrl = d?.data?.signedUrl || "";
  if (signedUrl) return signedUrl.split("?")[0];
  return d?.data?.originalUrl || d?.data?.url || d?.url || "";
};
