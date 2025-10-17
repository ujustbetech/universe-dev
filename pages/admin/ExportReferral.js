'use client';

import React from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const ReferralExportButton = () => {

  const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? `${prefix}_` : '';
      if (obj[k] && typeof obj[k] === 'object' && !(obj[k] instanceof Date)) {
        Object.assign(acc, flattenObject(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };

  const exportReferralData = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'Referral'));
      if (snapshot.empty) {
        alert('No referral data found');
        return;
      }

      const allData = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return flattenObject(data);
      });

      // Convert to CSV
      const csvHeaders = Object.keys(allData[0]);
      const csvRows = allData.map(row =>
        csvHeaders.map(field => `"${row[field] !== undefined ? row[field] : ''}"`).join(',')
      );

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\r\n');

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ReferralData.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Referral data exported successfully!');
    } catch (err) {
      console.error('Error exporting referral data:', err);
      alert('Failed to export referral data');
    }
  };

  return (
    <button onClick={exportReferralData} className="m-button-5">
      Export
    </button>
  );
};

export default ReferralExportButton;
