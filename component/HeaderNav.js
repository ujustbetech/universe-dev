import React, { useMemo } from "react";
import { useRouter } from "next/router";
import { FiHome } from "react-icons/fi";
import { MdOutlineBusinessCenter, MdBusinessCenter } from "react-icons/md";
import { BiSolidCoinStack } from "react-icons/bi";
import { MdPayment } from "react-icons/md";
import { GrGroup } from "react-icons/gr";
import { HiUser } from "react-icons/hi2";
import { useAuth } from "../context/authContext";
import { GiNewBorn } from "react-icons/gi";
import { FaPeopleArrows } from "react-icons/fa";

const HeaderNav = () => {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) return null;

  const navItems = useMemo(() => [
    { label: "Home", icon: <FiHome size={26} />, path: "/" },
    { label: "MM", icon: <MdOutlineBusinessCenter size={26} />, path: "/Monthlymeetdetails" },
    { label: "Conclave", icon: <GrGroup size={26} />, path: "/ConclaveMeeting" },
    { label: "Referrals", icon: <FaPeopleArrows size={26} />, path: `/ReferralList` },
     { label: "Payments", icon: <MdPayment size={26} />, path: `/PaymentRec` },
    { label: "Business", icon: <MdBusinessCenter size={26} />, path: "/ReferralDetails" },
 
      { label: "Prospect", icon: <GiNewBorn size={26} />, path: "/UsersProspect" },
    { label: "Profile", icon: <HiUser size={26} />, path: "/ProfilePage" },
  ], [user.phoneNumber]);

  const checkIsActive = (path) => {
    // Exact match for Home
    if (path === "/") return router.asPath === "/";
    // Partial match for dynamic routes like CP
    return router.asPath.startsWith(path);
  };

  return (
    <div className="sticky-buttons-container">
      {navItems.map((item) => {
        const isActive = checkIsActive(item.path);
        return (
          <div
            key={item.label}
            role="button"
            tabIndex={0}
            className={`icon-wrapper ${isActive ? "active" : ""}`}
            onClick={() => router.push(item.path)}
            onKeyPress={(e) => e.key === "Enter" && router.push(item.path)}
          >
            {item.icon}
            <span className="icon-label">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default HeaderNav;
