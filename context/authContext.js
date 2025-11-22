import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { COLLECTIONS } from "/utility_collection";
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load saved user from localStorage
  useEffect(() => {
    const storedPhone = localStorage.getItem("mmOrbiter");
    const storedUJBCode = localStorage.getItem("mmUJBCode");
    const storedName = localStorage.getItem("nameOrbiter");

    if (storedPhone && storedUJBCode && storedName) {
      setUser({ 
        phoneNumber: storedPhone, 
        ujbCode: storedUJBCode, 
        name: storedName 
      });
    }
    setLoading(false);
  }, []);

  // 🔍 Fetch from Firestore after OTP verification
const fetchUserAfterOtp = async (phone) => {
  try {
    const q = query(
      collection(db, "usersdetail"),
      where("MobileNo", "==", phone) // user enters plain 10 digit
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Mobile number not registered");
    }

    const matchedDoc = querySnapshot.docs[0];
    const data = matchedDoc.data();

    const name = data["Name"] || "User";
    const ujbCode = matchedDoc.id;

    const finalUser = { phoneNumber: phone, name, ujbCode };

    setUser(finalUser);

    localStorage.setItem("nameOrbiter", name);
    localStorage.setItem("mmOrbiter", phone);
    localStorage.setItem("mmUJBCode", ujbCode);

    logLoginEvent(phone, name, ujbCode);

    return finalUser;
  } catch (err) {
    throw err;
  }
};

  // 🚀 Login called only AFTER OTP success
  const login = async (phone) => {
    const userData = await fetchUserAfterOtp(phone);
    return userData; // No redirect here; login.js will handle redirect
  };

  // 🚪 Logout user
  const logout = () => {
    localStorage.removeItem("mmOrbiter");
    localStorage.removeItem("mmUJBCode");
    localStorage.removeItem("nameOrbiter");
    setUser(null);
    router.push("/login");
  };

  // 📝 Log login event
  const logLoginEvent = async (phoneNumber, name, ujbCode) => {
    try {
      const deviceInfo = navigator.userAgent;
      let ipAddress = "Unknown";

      try {
        const res = await fetch("https://api.ipify.org?format=json");
        ipAddress = (await res.json()).ip;
      } catch {}

      await setDoc(doc(collection(db, "LoginLogs")), {
        phoneNumber,
        name,
        ujbCode,
        loginTime: new Date(),
        deviceInfo,
        ipAddress,
      });
    } catch (err) {
      console.error("Error logging login:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
