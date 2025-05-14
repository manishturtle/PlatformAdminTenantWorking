import axios from "axios";

// Create an Axios instance
const axiosInstance = axios.create({
  // Set a base URL for your API. Adjust this if your backend runs elsewhere.
  // Example: use process.env.NEXT_PUBLIC_API_URL for environment variables
  baseURL: "https://bedevca.turtleit.in/api", // Assuming backend is on port 8000 and has /api prefix
  timeout: 10000, // Request timeout in milliseconds (e.g., 10 seconds)
  headers: {
    "Content-Type": "application/json",
    // JWT token will be added in the interceptor below
  },
});

// Add request interceptors to include JWT token in all requests
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from local storage
    const token = localStorage.getItem("authToken");

    // If token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Handle request error
    return Promise.reject(error);
  }
);

// Optional: Add response interceptors (e.g., for global error handling)
axiosInstance.interceptors.response.use(
  (response) => {
    // Any status code within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response && error.response.status === 401) {
      // Log the authentication error
      console.log("Authentication error: Token may be expired or invalid");

      // Only redirect to login if not already on a protected route
      // This prevents redirect loops and allows navigation within the app
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        // Don't remove token or redirect if we're already navigating within the app
        // Only clear token and redirect for API requests that fail authentication
        if (
          error.config &&
          error.config.url &&
          !error.config.url.includes(currentPath)
        ) {
          localStorage.removeItem("authToken");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
