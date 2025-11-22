import React, { useState } from "react";
import { useRouter } from "next/router";
import Swal from "sweetalert2";
import "../src/app/styles/login.scss";
import { useAuth } from "../context/authContext";

const LoginPage = () => {
  const router = useRouter();
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [userKey, setUserKey] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // ✅ STEP 1: Validate number in DB & Send Entry Key
  const sendEntryKey = async (e) => {
    e.preventDefault();

    if (phone.length !== 10) {
      Swal.fire("Invalid", "Please enter 10 digit mobile number", "warning");
      return;
    }

    setLoading(true);

    try {
      // ✅ FIRST CHECK USER EXISTS IN FIRESTORE
      await login(phone); // this checks userdetail DB

      const key = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedKey(key);

      const response = await fetch(
        "https://graph.facebook.com/v18.0/527476310441806/messages",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: "91" + phone, // ✅ 91 added automatically here
            type: "template",
            template: {
              name: "code",
              language: { code: "en" },
              components: [
                {
                  type: "body",
                  parameters: [
                    {
                      type: "text",
                      text: key,
                    },
                  ],
                },
              ],
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.error?.message);

      Swal.fire("Sent!", "Entry Key sent on WhatsApp", "success");
      setStep(2);

    } catch (error) {
      Swal.fire("Error", error.message || "Number not registered", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ STEP 2: Verify Entry Key
  const verifyKey = async (e) => {
    e.preventDefault();

    if (userKey === generatedKey) {
      Swal.fire("Success", "Login Successful", "success");
      router.push("/");
    } else {
      Swal.fire("Invalid", "Incorrect Entry Key", "error");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-section">
          <img src="/ujustlogo.png" alt="Logo" className="logo" />
          <h2>UJustBe Universe</h2>
          <p>Secure access with WhatsApp Entry Key</p>
        </div>

        {step === 1 && (
          <form className="login-form" onSubmit={sendEntryKey}>
            <input
              type="text"
              placeholder="Enter 10 digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              required
            />
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Entry Key"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="login-form" onSubmit={verifyKey}>
            <input
              type="text"
              placeholder="Enter Entry Key"
              value={userKey}
              onChange={(e) => setUserKey(e.target.value)}
              required
            />
             
            <button className="login-btn" type="submit">Verify & Login</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
