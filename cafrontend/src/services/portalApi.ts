import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { Customer } from "@/types/customer";
import { portalAuthService } from "./portalAuthService";

// Create a separate axios instance for portal API
const portalApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8020",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
portalApiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = portalAuthService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);

interface PortalLoginResponse {
  token: string;
  customer: Customer;
}

interface PortalCheckEmailResponse {
  exists: boolean;
  allowPortalAccess: boolean;
  hasPassword: boolean;
  emailVerified?: boolean;
  mobileVerified?: boolean;
}

interface PortalOTPResponse {
  message: string;
}

interface PortalSignupResponse {
  message: string;
  customer: Customer;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  allowPortalAccess: boolean;
}

interface AuthResponse {
  token: string;
  user: UserInfo;
}

export const portalApi = {
  setPassword: async (email: string, password: string) => {
    // Hash password using SHA-256
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const response = await portalApiClient.post("/api/portal/set-password/", {
      Email: email,
      Password: hashedPassword,
    });
    return response.data;
  },

  checkEmail: async (
    email: string
  ): Promise<{
    exists: boolean;
    allowPortalAccess: boolean;
    hasPassword: boolean;
  }> => {
    const response = await portalApiClient.post("/api/portal/check-email/", {
      Email: email,
    });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    // Convert password string to Uint8Array
    const msgBuffer = new TextEncoder().encode(password);
    // Hash the password using SHA-256
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const response = await portalApiClient.post("/api/portal/login/", {
      Email: email,
      Password: hashedPassword,
    });
    return response.data;
  },

  requestOTP: async (
    email: string,
    mode: "signup" | "login" = "login"
  ): Promise<{ message: string }> => {
    const endpoint =
      mode === "signup"
        ? "/api/portal/request-signup-otp/"
        : "/api/portal/request-otp/";
    const response = await portalApiClient.post(endpoint, {
      Email: email,
    });
    console.log("Request OTP payload:", { Email: email, mode, endpoint });
    return response.data;
  },

  verifyOTP: async (email: string, otp: string): Promise<AuthResponse> => {
    const response = await portalApiClient.post("/api/portal/verify-otp/", {
      Email: email,
      OTP: otp,
    });
    return response.data;
  },

  getUserInfo: async (): Promise<UserInfo> => {
    const response = await portalApiClient.get("/api/portal/user-info/");
    return response.data;
  },

  signup: async (data: {
    Email: string;
    Password: string;
    FirstName: string;
    LastName: string;
    Phone: string;
  }): Promise<{ message: string }> => {
    // Hash password using SHA-256
    const msgBuffer = new TextEncoder().encode(data.Password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const response = await portalApiClient.post("/api/portal/signup/", {
      Email: data.Email,
      Password: hashedPassword,
      FirstName: data.FirstName,
      LastName: data.LastName,
      Phone: data.Phone,
    });
    return response.data;
  },

  resendOTP: async (email: string): Promise<{ message: string }> => {
    const response = await portalApiClient.post("/api/portal/resend-otp/", {
      Email: email,
    });
    console.log("Resend OTP payload:", { Email: email });
    console.log("Resend OTP response:", response.data);
    return response.data;
  },
};
