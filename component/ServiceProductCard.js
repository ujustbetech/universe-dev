"use client";

import React from "react";
import { CiImageOff } from "react-icons/ci";
import { useRouter } from "next/navigation";
import styles from "../src/app/styles/Offercard.module.scss";

const ServiceProductCard = ({
  item,
  onRefer,
  onView,
  disableNavigation = false, // ⭐ NEW PROP
}) => {
  const router = useRouter();

  // ✅ Navigate ONLY when allowed
  const handleCardClick = () => {
    if (disableNavigation) return;       // ⛔ modal / recommendation
    if (!item?.mainId) return;
    router.push(`/BusinessDetails/${item.mainId}`);
  };

  const displayName =
    item?.name ||
    item?.productName ||
    item?.serviceName ||
    "—";

  return (
    <div
      className={styles.cardsDiv}
      style={{ cursor: disableNavigation ? "default" : "pointer" }}

      // ⭐ Desktop hover
      onMouseEnter={() => onView?.(item)}

      // ⭐ Mobile tap (IMPORTANT)
      onTouchStart={() => onView?.(item)}

      onClick={handleCardClick}
    >
      <div className={styles.cardImg}>
        {item?.imageURL ? (
          <img src={item.imageURL} alt={displayName} />
        ) : (
          <div className={styles.thumbnail_NA}>
            <CiImageOff />
          </div>
        )}

        {item?.percentage && (
          <span className={styles.wdp_ribbon}>
            {item.percentage}
            <abbr>%</abbr>
          </span>
        )}
      </div>

      <div className={styles.description}>
        <h4>{displayName}</h4>
        <p className={styles.ownerInfo}>{item?.businessName}</p>

        {/* ✅ Referral button must NOT navigate */}
        {onRefer && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // ⛔ stop card click
              onRefer(item);       // ✅ open referral modal
            }}
          >
            Send Referral
          </button>
        )}
      </div>
    </div>
  );
};

export default ServiceProductCard;
