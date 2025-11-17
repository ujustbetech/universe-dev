// pages/login.jsx  OR  app/login/page.jsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation"; // App Router
// import { useRouter } from "next/router"; // Pages Router (if using pages/)
import Swal from "sweetalert2";
import { signInWithPhoneNumber } from "firebase/auth";
import { auth, setupRecaptcha } from "../firebaseConfig"; // ← Your file
import "../src/app/styles/login.scss";

const LoginPage = () => {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  const formatPhone = (num) => {
    const cleaned = num.replace(/\D/g, "");
    if (cleaned.length === 10) return `+91${cleaned}`;
    if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
    return `+91${cleaned}`;
  };

const sendOTP = async (e) => {
  e.preventDefault();
  const formatted = formatPhone(phone);

  setLoading(true);
  try {
    const verifier = setupRecaptcha();        // ← This now works
    await verifier.render();                  // ← Important!
    const result = await signInWithPhoneNumber(auth, formatted, verifier);
    
    setConfirmationResult(result);
    setShowOtp(true);
    Swal.fire("Success", "OTP Sent!", "success");
  } catch (err) {
    console.error(err);
    Swal.fire("Error", err.message, "error");
  } finally {
    setLoading(false);
  }
};
  const verifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      Swal.fire({
        icon: "success",
        title: "Login Successful!",
        timer: 1500,
        showConfirmButton: false,
      });
      router.push("/"); // or "/dashboard"
    } catch (err) {
      Swal.fire("Invalid OTP", err.message || "Wrong code", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-section">
          <img src="/ujustlogo.png" alt="Logo" className="logo" />
          <h2>UJustBe Universe</h2>
          <p>Welcome back! Login to continue</p>
        </div>

        {!showOtp ? (
          <form className="login-form" onSubmit={sendOTP}>
            <input
              type="text"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
              required
            />
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={verifyOTP}>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "10px" }}>
              OTP sent to {formatPhone(phone)}
            </p>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              style={{ letterSpacing: "10px", fontSize: "20px", textAlign: "center" }}
              required
            />
            <button type="submit" className="login-btn" disabled={loading || otp.length < 6}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowOtp(false);
                setOtp("");
                setConfirmationResult(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#007bff",
                fontSize: "13px",
                marginTop: "12px",
                cursor: "pointer",
              }}
            >
              ← Change Number
            </button>
          </form>
        )}
      </div>

      {/* Invisible reCAPTCHA */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default LoginPage;