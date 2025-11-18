import React, { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/authContext";
import Swal from "sweetalert2";
import "../src/app/styles/login.scss";

const LoginPage = () => {
  const { login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    try {
      await login(phone);
      Swal.fire({ icon: "success", title: "Login Successful", timer: 1500, showConfirmButton: false });
      router.push("/");
    } catch (err) {
      Swal.fire({ icon: "error", title: "Login Failed", text: err.message || "User not found" });
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
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
