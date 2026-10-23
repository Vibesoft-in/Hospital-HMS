import axios from "axios";
import { getICDAccessToken } from "./icd-token.helper";

const ICD_API_BASE = "https://id.who.int/icd/release/11/2024-01/mms";

const ICD_HEADERS = {
  Accept: "application/json",
  "Accept-Language": "en",
  "API-Version": "v2",
};

export interface ICDSearchResult {
  icdCode: string;
  diagnosisName: string;
  isLeaf: boolean;
}

export async function searchICD(term: string): Promise<ICDSearchResult[]> {
  const token = await getICDAccessToken();

  const response = await axios.get(`${ICD_API_BASE}/search`, {
    headers: {
      ...ICD_HEADERS,
      Authorization: `Bearer ${token}`,
    },
    params: {
      q: term,
      useFlexisearch: true,
      flatResults: true,
      highlightingEnabled: false,
    },
  });

  const destinationEntities: any[] = response.data?.destinationEntities ?? [];

  return destinationEntities.map((entity: any) => ({
    icdCode: entity.theCode ?? "",
    diagnosisName: entity.title ?? "",
    isLeaf: entity.isLeaf ?? false,
  }));
}
