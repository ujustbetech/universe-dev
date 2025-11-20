'use client';

import React from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { COLLECTIONS } from "/utility_collection";
import { db } from '../../firebaseConfig';

const ReferralExportButton = () => {

  // Flatten object but handle Firestore Timestamp properly
  const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, key) => {
      const pre = prefix ? `${prefix}_` : '';

      const value = obj[key];

      if (
        value &&
        typeof value === 'object' &&
        !(value instanceof Date) &&
        !(value?.toDate) // timestamp check
      ) {
        // Nested object → flatten again
        Object.assign(acc, flattenObject(value, pre + key));
      } 
      else {
        // Convert Firestore Timestamp to readable date
        if (value?.toDate) {
          acc[pre + key] = value.toDate().toLocaleString();
        } else {
          acc[pre + key] = value !== undefined ? value : '';
        }
      }
      return acc;
    }, {});
  };

  const exportReferralData = async () => {
    try {
      const snapshot = await getDocs(collection(db,  COLLECTIONS.referral));

      if (snapshot.empty) {
        alert('No referral data found');
        return;
      }

      const allData = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return flattenObject(data); // flatten cosmoOrbiter, orbiter, product
      });

      // Generate stable column order
      const csvHeaders = Array.from(
        new Set(allData.flatMap(item => Object.keys(item)))
      );

      // CSV rows
      const csvRows = allData.map(row =>
        csvHeaders.map(field => `"${row[field] || ''}"`).join(',')
      );

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\r\n');

      // Download CSV file
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
