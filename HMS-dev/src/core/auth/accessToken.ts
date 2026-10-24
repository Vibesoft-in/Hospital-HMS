import store from "@/core/redux/store";
import { setCredentials, clearCredentials } from "@/core/redux/authSlice";

let inMemoryAccessToken: string | null = null;

export const getAccessToken = (): string | null => inMemoryAccessToken;

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
  if (token) {
    try {
      const rawUser = typeof window !== "undefined" ? window.localStorage.getItem("authUser") : null;
      const user = rawUser ? JSON.parse(rawUser) : undefined;
      store.dispatch(setCredentials({ accessToken: token, user }));
    } catch {
      store.dispatch(setCredentials({ accessToken: token }));
    }
  } else {
    store.dispatch(clearCredentials());
  }
};
