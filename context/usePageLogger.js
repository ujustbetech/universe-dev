import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "./authContext";

export const usePageLogger = () => {
  const router = useRouter();
  const { user } = useAuth();
  const visitDocRef = useRef(null);
  const startTime = useRef(null);

  useEffect(() => {
    if (!user) return;

    startTime.current = new Date();
    visitDocRef.current = doc(collection(db, "PageVisits")); // single doc for this page

    const getBrowserInfo = () => {
      const ua = navigator.userAgent;
      const parser = (() => {
        // Minimal parsing
        const browserMatch = ua.match(/(firefox|msie|chrome|safari|trident)/gi) || [];
        const osMatch = ua.match(/(windows|mac|linux|android|iphone|ipad)/gi) || [];
        return {
          browser: browserMatch[0] || "Unknown",
          os: osMatch[0] || "Unknown",
          userAgent: ua,
        };
      })();
      return parser;
    };

    const logVisit = async () => {
      const { browser, os, userAgent } = getBrowserInfo();
      await setDoc(visitDocRef.current, {
        userPhone: user.phoneNumber,
        userName: user.name,
        pageName: router.pathname,
        pageURL: window.location.href,
        startTime: startTime.current,
        durationMs: 0,
        browser,
        os,
        userAgent,
      });
    };
    logVisit();

    const handleUnload = () => {
      const endTime = new Date();
      const durationMs = endTime - startTime.current;
      const { browser, os, userAgent } = getBrowserInfo();
      setDoc(visitDocRef.current, {
        userPhone: user.phoneNumber,
        userName: user.name,
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

    // On route change, log duration for current page
    const handleRouteChange = () => {
      handleUnload(); // log current page
      startTime.current = new Date(); // reset startTime for new page
      visitDocRef.current = doc(collection(db, "PageVisits")); // new doc for new page
      logVisit(); // log new page visit
    };

    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      handleUnload();
      window.removeEventListener("beforeunload", handleUnload);
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router.pathname, router.events, user]);
};
