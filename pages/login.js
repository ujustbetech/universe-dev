import React, { useState } from "react";
import { useRouter } from "next/router";
import Swal from "sweetalert2";
import "../src/app/styles/login.scss";

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // ⭐ Send OTP to WhatsApp (Without API route)
  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Create OTP
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(newOtp);

    try {
      // WhatsApp API call directly from page
  
 const WHATSAPP_TOKEN = 'https://graph.facebook.com/v22.0/527476310441806/messages';
 const PHONE_NUMBER_ID = 'Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD';
      const messageData = {
        messaging_product: "whatsapp",
        to: "91" + phone,
        type: "template",
        template: {
          name: "code", // your approved template name
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: newOtp }],
            },
          ],
        },
      };

      const response = await fetch(
        `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messageData),
        }
      );

      const data = await response.json();
      console.log("WhatsApp API Response:", data);

      if (data.error) throw new Error("Failed to send message");

      Swal.fire({
        icon: "success",
        title: "OTP Sent to WhatsApp",
        timer: 1500,
        showConfirmButton: false,
      });

      setStep(2);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Failed to Send OTP",
        text: err.message,
      });
    }

    setLoading(false);
  };

  // ⭐ Verify OTP
  const verifyOtp = (e) => {
    e.preventDefault();

    if (otp === generatedOtp) {
      Swal.fire({
        icon: "success",
        title: "Login Successful",
        timer: 1500,
        showConfirmButton: false,
      });

      router.push("/");
    } else {
      Swal.fire({
        icon: "error",
        title: "Invalid OTP",
        text: "Try again",
      });
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

        {/* STEP 1 — Phone Number */}
        {step === 1 && (
          <form className="login-form" onSubmit={sendOtp}>
            <input
              type="text"
              placeholder="Enter WhatsApp number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {/* STEP 2 — OTP Input */}
        {step === 2 && (
          <form className="login-form" onSubmit={verifyOtp}>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />

            <button type="submit" className="login-btn">
              Verify OTP
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
