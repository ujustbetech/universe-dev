"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../context/authContext";
import Swal from "sweetalert2";
import "../src/app/styles/login.scss";

const CLIENT_ID = "11336728746418285274";

const LoginPage = () => {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("access_token");

  const [loading, setLoading] = useState(false);

  // 🔐 Trigger OTP popup
  const openLoginWindow = useCallback(() => {
    const top = (window.screen.height - 600) / 2;
    const left = (window.screen.width - 500) / 2;

    const REDIRECT_URL = window.location.href;
    const AUTH_URL = `https://www.phone.email/auth/log-in?client_id=${CLIENT_ID}&redirect_url=${REDIRECT_URL}`;

    window.open(
      AUTH_URL,
      "peLoginWindow",
      `toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,
      width=500,height=560,top=${top},left=${left}`
    );
  }, []);

  // ✅ After OTP success
  const verifyOTPAndLogin = async () => {
    try {
      setLoading(true);

      const url = "https://eapi.phone.email/getuser";
      const data = new FormData();
      data.append("access_token", accessToken);
      data.append("client_id", CLIENT_ID);

      const response = await fetch(url, { method: "POST", body: data });
      const responseData = await response.json();

      if (responseData.status !== 200) {
        throw new Error("OTP verification failed");
      }

      const phone = responseData.phone_no;

      await login(phone);

      Swal.fire({
        icon: "success",
        title: "Login Successful",
        timer: 1500,
        showConfirmButton: false,
      });

      router.push("/");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "User not registered",
        text: "This phone number is not found in our system",
      });
      setLoading(false);
    }
  };

  // ✅ Detect access token after OTP redirect
  useEffect(() => {
    if (accessToken) {
      verifyOTPAndLogin();
    }
  }, [accessToken]);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-section">
          <img src="/ujustlogo.png" alt="Logo" className="logo" />
          <h2>UJustBe Universe</h2>
          <p>Welcome back! Login to continue</p>
        </div>

        <div className="login-form">
          <button
            type="button"
            className="login-btn"
            onClick={openLoginWindow}
            disabled={loading}
          >
            {loading ? "Verifying OTP..." : "Login with Phone OTP"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
