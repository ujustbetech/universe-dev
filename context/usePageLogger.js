import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "./authContext";
import { COLLECTIONS } from "/utility_collection";

export const usePageLogger = () => {
  const router = useRouter();
  const { user } = useAuth();
  const visitDocRef = useRef(null);
  const startTime = useRef(null);

  useEffect(() => {
    if (!user) return;

    startTime.current = new Date();
    visitDocRef.current = doc(collection(db, COLLECTIONS.pageVisit));

    const getBrowserInfo = () => {
      const ua = navigator.userAgent;
      const browserMatch = ua.match(/(firefox|msie|chrome|safari|trident)/gi) || [];
      const osMatch = ua.match(/(windows|mac|linux|android|iphone|ipad)/gi) || [];
      return {
        browser: browserMatch[0] || "Unknown",
        os: osMatch[0] || "Unknown",
        userAgent: ua,
      };
    };

    const logVisit = async () => {
      const { browser, os, userAgent } = getBrowserInfo();
      await setDoc(visitDocRef.current, {
        userPhone: user.phone || "—",
        userUjbCode: user.ujbCode || "—",
        userName: user.name || "—",
        pageName: router.pathname,
        pageURL: window.location.href,
        startTime: startTime.current,
        durationMs: 0,
        browser,
        os,
        userAgent,
      });
    };

    const handleUnload = () => {
      const endTime = new Date();
      const durationMs = endTime - startTime.current;
      const { browser, os, userAgent } = getBrowserInfo();

      setDoc(visitDocRef.current, {
        userPhone: user.phone || "—",
        userUjbCode: user.ujbCode || "—",
        userName: user.name || "—",
        pageName: router.pathname,
        pageURL: window.location.href,
        startTime: startTime.current,
        durationMs,
        browser,
        os,
        userAgent,
      });
    };

    window.addEventListener("beforeunload", handleUnload);

    const handleRouteChange = () => {
      handleUnload();
      startTime.current = new Date();
      visitDocRef.current = doc(collection(db, COLLECTIONS.pageVisit));
      logVisit();
    };

    router.events.on("routeChangeStart", handleRouteChange);

    logVisit(); // initial log

    return () => {
      handleUnload();
      window.removeEventListener("beforeunload", handleUnload);
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router.events, router.pathname, user]);
};
