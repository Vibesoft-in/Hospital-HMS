"use client";

import "@/core/api/axiosAuth";
// import ImageWithBasePath from "@/core/imageWithBasePath";
import PranaOSBrand from "@/core/common/pranaos-brand/PranaOSBrand";
import { getDefaultRouteForRole } from "@/core/auth/roleAccess";
import {
  isSharedAuthEnabled,
  postSharedLogin,
  syncHospitalSessionFromSharedCookie,
} from "@/core/auth/sharedAuth";
import { setHmsAuthCookie } from "@/core/auth/sessionCookie";
import { getAccessToken, setAccessToken, silentRefresh } from "@/core/auth/inMemoryToken";
import { all_routes } from "@/routes/all_routes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import { useEffect, useState } from "react";
type PasswordField = "password" | "confirmPassword";

const LoginComponent = () => {
  const router = useRouter();
  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPostLoginRoute = (role?: string) => {
    const normalizedRole = (role || "").toUpperCase();
    const route = getDefaultRouteForRole(normalizedRole);
    return route === all_routes.login ? all_routes.dashboard : route;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let token = getAccessToken();
      if (!token) {
        token = await silentRefresh();
      }
      if (cancelled || !token) return;

      setHmsAuthCookie();
      try {
        const raw = localStorage.getItem("authUser");
        const user = raw ? JSON.parse(raw) : null;
        router.replace(getPostLoginRoute(user?.role));
      } catch {
        router.replace(all_routes.dashboard);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!API_BASE_URL) {
      setError("API configuration error. Please contact support.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      if (isSharedAuthEnabled()) {
        try {
          const shared = await postSharedLogin(email.trim(), password);
          if (shared.ok) {
            const raw = localStorage.getItem("authUser");
            const user = raw ? JSON.parse(raw) : null;
            router.push(getPostLoginRoute(user?.role));
            return;
          }
          // If shared auth explicitly rejected credentials (e.g., 401 unauthorized), display the message
          if (shared.message && !shared.message.toLowerCase().includes("timeout") && !shared.message.toLowerCase().includes("network")) {
            setError(shared.message);
            return;
          }
        } catch {
          // Fall through to direct hospital login
        }
      }

      const response = await axios.post(
        `${API_BASE_URL}/hospital/auth/login`,
        {
          email: email.trim(),
          password,
        },
        { withCredentials: true }
      );

      const accessToken =
        (response.data as any)?.data?.accessToken ||
        (response.data as any)?.accessToken ||
        null;
      const user = (response.data as any)?.data?.user || null;

      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        if (user) {
          localStorage.setItem("authUser", JSON.stringify(user));
        }
        setHmsAuthCookie();
      } catch {
        // ignore storage errors
      }

      router.push(getPostLoginRoute(user?.role));
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please check your credentials.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      {/* Start Content */}
      <div className="auth-bg position-relative overflow-hidden">
        <div className="container-fuild position-relative z-1">
          <div className="w-100 overflow-hidden position-relative flex-wrap d-block vh-100">
            {/* start row */}
            <div className="row justify-content-center align-items-center vh-100 overflow-auto flex-wrap py-3">
              <div className="col-lg-4 mx-auto">
                <form
                  className="d-flex justify-content-center align-items-center"
                  onSubmit={handleSubmit}
                >
                  <div className="d-flex flex-column justify-content-lg-center p-4 p-lg-0 pb-0 flex-fill">
                    <div className="mx-auto mb-4 d-flex justify-content-center">
                      {/* <img
                        src="/JJM Logo.png"
                        className="img-fluid"
                        alt="Logo"
                      /> */}
                      <PranaOSBrand size="lg" />
                    </div>
                    <div className="card border-1 p-lg-3 shadow-md rounded-3 mb-4">
                      <div className="card-body">
                        {error && (
                          <div className="alert alert-danger py-2 mb-3">
                            {error}
                          </div>
                        )}
                        <div className="text-center mb-3">
                          <h5 className="mb-1 fs-20 fw-bold">Sign In</h5>
                          <p className="mb-0">
                            Please enter below details to access the dashboard
                          </p>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Email Address</label>
                          <div className="input-group">
                            <span className="input-group-text border-end-0 bg-white">
                              <i className="ti ti-mail fs-14 text-dark" />
                            </span>
                            <input
                              type="text"
                              className="form-control border-start-0 ps-0"
                              placeholder="Enter email address"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Password</label>
                          <div className="position-relative">
                          <div className="pass-group input-group position-relative border rounded">
                                  <span className="input-group-text bg-white border-0">
                                    <i className="ti ti-lock text-dark fs-14" />
                                  </span>
                                  <input
                                    type={
                                      passwordVisibility.password
                                        ? "text"
                                        : "password"
                                    }
                                    className="pass-input form-control border-start-0 ps-0"
                                    placeholder="****************"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                  />
                                  <span
                                    className={`ti toggle-password text-dark fs-14 ${
                                      passwordVisibility.password
                                        ? "ti-eye"
                                        : "ti-eye-off"
                                    }`}
                                    onClick={() =>
                                      togglePasswordVisibility("password")
                                    }
                                  ></span>
                                </div>
                          </div>
                        </div>
                        
                        <div className="mb-2">
                          <button
                            type="submit"
                            className="btn bg-primary text-white w-100"
                            disabled={loading}
                          >
                            {loading ? "Logging in..." : "Login"}
                          </button>
                        </div>
                      </div>
                      {/* end card body */}
                    </div>
                    {/* end card */}
                  </div>
                </form>
              </div>
              {/* end col */}
            </div>
            {/* end row */}
          </div>
        </div>
      </div>
      {/* End Content */}
    </>
  );
};

export default LoginComponent;
