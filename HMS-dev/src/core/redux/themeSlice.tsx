import { createSlice } from "@reduxjs/toolkit";


// Simple cookie helpers that are safe on the server
const isBrowser = typeof document !== "undefined";

const getCookie = (name: string): string | null => {
  if (!isBrowser) return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name: string, value: string, days = 365) => {
  if (!isBrowser) return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const removeCookie = (name: string) => {
  if (!isBrowser) return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
};

const defaultThemeSettings = {
  "data-bs-theme": "light",
  "data-sidebar": "light",
  "data-color": "primary",
  "data-topbar": "white",
  "data-layout": "default",
  "data-size": "default",
  "data-width": "fluid",
  "data-sidebarbg": "none",
  "dir": "ltr",
};


const initialState = {
  themeSettings: (() => {
    // Hydrate from cookies only on the client; fallback to defaults on server
    const raw = getCookie("themeSettings");
    try {
      return raw ? JSON.parse(raw) : defaultThemeSettings;
    } catch {
      return defaultThemeSettings;
    }
  })(),
};


const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    updateTheme: (state, { payload }) => {
      if (payload.dir === "rtl") {
        state.themeSettings = { ...defaultThemeSettings, dir: "rtl" };
      } else if (state.themeSettings.dir === "rtl" && payload.dir !== "rtl") {
        state.themeSettings = { ...defaultThemeSettings, ...payload, dir: "ltr" };
      } else {
        state.themeSettings = { ...state.themeSettings, ...payload };
      }


      setCookie("themeSettings", JSON.stringify(state.themeSettings));
    },
    resetTheme: (state) => {
      state.themeSettings = defaultThemeSettings;
      removeCookie("themeSettings");
    },
  },
});


export const { updateTheme, resetTheme } = themeSlice.actions;


export default themeSlice.reducer;





