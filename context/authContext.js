import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { phoneNumber, name, ujbCode }
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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


  // ✅ Fetch user by phone using query
  const fetchUser = async (phone) => {
    try {
      const q = query(collection(db, "userdetail_dev"), where("MobileNo", "==", phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const matchedDoc = querySnapshot.docs[0];
        const data = matchedDoc.data();
        console.log("userdetails", data);
        
        const name = data["Name"] || data[" Name"] || "User";
        console.log("Name", name);
        const ujbCode = matchedDoc.id;

        setUser({ phoneNumber: phone, name, ujbCode });
      
        localStorage.setItem("nameOrbiter", name);
        localStorage.setItem("mmOrbiter", phone);
        localStorage.setItem("mmUJBCode", ujbCode);

        logLoginEvent(phone, name, ujbCode);
        return { phone, name, ujbCode };
      } else {
        throw new Error("User not found");
      }
    } catch (err) {
      console.error("Error fetching user:", err);
      throw err;
    }
  };

  // ✅ Login function
  const login = async (phone) => {
    const userData = await fetchUser(phone);
    setUser(userData);
    console.log("User Details",user);
    
    router.push("/");
  };

  // ✅ Logout function
  const logout = () => {
    localStorage.removeItem("mmOrbiter");
    localStorage.removeItem("mmUJBCode");
    localStorage.removeItem("nameOrbiter");
    setUser(null);
    router.push("/login");
  };

  // ✅ Log login event
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
