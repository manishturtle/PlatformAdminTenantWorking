// Simple script to test the authentication flow
const axios = require("axios");

const API_URL = "http://localhost:8020";

async function testAuthentication() {
  console.log("Testing authentication flow...");

  try {
    // Step 1: Attempt login
    console.log("Step 1: Attempting login...");
    const loginResponse = await axios.post(`${API_URL}/api/login/`, {
      user_id: "admin",
      password: "password123",
    });

    console.log("Login successful!");
    console.log("Response:", loginResponse.data);

    const token = loginResponse.data.access;
    console.log("JWT Token:", token);

    // Step 2: Test protected endpoint with token
    console.log("\nStep 2: Testing protected endpoint with token...");
    const customersResponse = await axios.get(
      `${API_URL}/api/customers/?page=1&page_size=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Protected endpoint access successful!");
    console.log("Customers count:", customersResponse.data.count);

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error("Authentication test failed:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
      console.error("Headers:", error.response.headers);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error:", error.message);
    }

    return {
      success: false,
      error,
    };
  }
}

// Run the test
testAuthentication().then((result) => {
  if (result.success) {
    console.log("\nAuthentication flow test PASSED ✅");
    console.log("Use this token in your application:", result.token);
  } else {
    console.log("\nAuthentication flow test FAILED ❌");
  }
});
