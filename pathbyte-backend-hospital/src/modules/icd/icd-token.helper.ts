import axios from "axios";
import qs from "qs";

const TOKEN_ENDPOINT = "https://icdaccessmanagement.who.int/connect/token";

let cachedToken: string | null = null;
let tokenExpiry = 0;

export async function getICDAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.ICD_CLIENT_ID;
  const clientSecret = process.env.ICD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("ICD_CLIENT_ID and ICD_CLIENT_SECRET must be set in environment variables.");
  }

  const data = qs.stringify({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "icdapi_access",
  });

  const response = await axios.post(TOKEN_ENDPOINT, data, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  cachedToken = response.data.access_token;
  // subtract 60s buffer before expiry
  tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60_000;

  return cachedToken!;
}
