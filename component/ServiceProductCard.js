import React from 'react';
import { CiImageOff } from 'react-icons/ci';
import styles from '../src/app/styles/Offercard.module.scss';

const ServiceProductCard = ({ item, onRefer }) => {
  return (
    <div className={styles.cardsDiv}>
      <div className={styles.cardImg}>
        {item.imageURL ? (
          <img src={item.imageURL} alt={item.name} />
        ) : (
          <div className={styles.thumbnail_NA}><CiImageOff /></div>
        )}
        <span className={styles.wdp_ribbon}>{item.percentage}<abbr>%</abbr></span>
      </div>

      <div className={styles.description}>
        <h4>{item.name}</h4>
        <p className={styles.ownerInfo}>{item.businessName}</p>
        <button onClick={onRefer}>Send Referral</button>
      </div>
    </div>
  );
};

export default ServiceProductCard;
