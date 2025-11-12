"use client";

import React, { useState } from "react";
import { useAuth } from "../context/authContext";
import { getAuthInstance, RecaptchaVerifier, signInWithPhoneNumber } from "../firebaseConfig";
import Swal from "sweetalert2";
import "../src/app/styles/login.scss";

const LoginPage = () => {
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // ✅ Setup reCAPTCHA safely
const setupRecaptcha = () => {
  if (typeof window === "undefined") return; // prevent SSR

  const auth = getAuthInstance();
  if (!auth) {
    console.error("Auth instance not initialized yet");
    return;
  }

  if (!window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth, // ✅ auth must be first argument
        "recaptcha-container",
        {
          size: "invisible",
          callback: (response) => {
            console.log("reCAPTCHA solved:", response);
          },
          
          "expired-callback": () => {
            console.log("reCAPTCHA expired, resetting...");
          },
        }
      );
      window.recaptchaVerifier.render();
    } catch (error) {
      console.error("Error initializing reCAPTCHA:", error);
    }
  }
};


  const startTimer = () => {
    let counter = 30;
    setTimer(counter);
    setCanResend(false);
    const interval = setInterval(() => {
      counter--;
      setTimer(counter);
      if (counter <= 0) {
        clearInterval(interval);
        setCanResend(true);
      }
    }, 1000);
  };

 const sendOTP = async (e) => {
  e.preventDefault();
  if (!phone || phone.length !== 10) {
    Swal.fire("Invalid Number!", "Enter a 10-digit phone number.", "warning");
    return;
  }

  setLoading(true);
  const auth = getAuthInstance();

  try {
    // ✅ Ensure Recaptcha initialized
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
      await window.recaptchaVerifier.render();
    }

    const appVerifier = window.recaptchaVerifier;

    // ✅ Send OTP
    const result = await signInWithPhoneNumber(auth, `+91${phone}`, appVerifier);
    setConfirmationResult(result);
    Swal.fire("✅ OTP Sent", "Check your SMS for the code.", "success");
    startTimer();

  } catch (error) {
    console.error("OTP Error:", error);
    Swal.fire("❌ Failed to send OTP", error.message, "error");
  } finally {
    setLoading(false);
  }
};


  const verifyOTP = async () => {
    if (!otp) {
      Swal.fire("Enter OTP", "Please enter the code sent to your phone.", "info");
      return;
    }

    try {
      await confirmationResult.confirm(otp);
      Swal.fire("✅ OTP Verified", "Logging you in...", "success");
      await login(phone);
    } catch (err) {
      Swal.fire("❌ Invalid OTP", "Please try again.", "error");
    }
  };

  return (
    <div className="login-page">
      <div id="recaptcha-container"></div>
      <div className="login-card">
        <div className="logo-section">
          <img src="/ujustlogo.png" alt="Logo" className="logo" />
          <h2>UJustBe Universe</h2>
          <p>OTP Login to Continue</p>
        </div>

        {!confirmationResult ? (
          <form className="login-form" onSubmit={sendOTP}>
            <input
              type="text"
              placeholder="Enter your phone number"
              maxLength="10"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <div className="login-form">
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button onClick={verifyOTP} className="login-btn">
              Verify OTP
            </button>
            {!canResend ? (
              <p style={{ marginTop: "10px", color: "#888" }}>
                Resend OTP in: <b>{timer}s</b>
              </p>
            ) : (
              <button className="resend-btn" onClick={sendOTP}>
                🔁 Resend OTP
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
