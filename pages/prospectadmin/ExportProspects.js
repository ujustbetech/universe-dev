'use client';

import React, { useEffect, useState } from 'react';
import { db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const ExportProspects = () => {
  const [loading, setLoading] = useState(false);

  const fetchProspects = async () => {
    setLoading(true);
    try {
      const rootCol = collection(db, 'Prospects');
      const prospectSnapshot = await getDocs(rootCol);
      const mergedData = [];

      for (const pDoc of prospectSnapshot.docs) {
        const pData = pDoc.data();
        const prospectId = pDoc.id;

        // Initialize merged object with root-level data
        const merged = {
          prospectId,
          prospectName: pData.prospectName || '',
          prospectPhone: pData.prospectPhone || '',
          email: pData.email || '',
          registeredAt: pData.registeredAt
            ? (pData.registeredAt.toDate ? pData.registeredAt.toDate().toLocaleString() : pData.registeredAt)
            : '',
          type: pData.type || '',
          userType: pData.userType || '',
        };

        // Fetch engagementform subcollection if it exists
        try {
          const engagementCol = collection(db, `Prospects/${prospectId}/engagementform`);
          const engagementSnapshot = await getDocs(engagementCol);
          merged.engagement = engagementSnapshot.docs.map(ed => {
            const data = ed.data();
            return {
              docId: ed.id,
              callDate: data.callDate || '',
              discussionDetails: data.discussionDetails || '',
              nextFollowupDate: data.nextFollowupDate || '',
              occasion: data.occasion || '',
              orbiterName: data.orbiterName || '',
              orbiterSuggestions: data.orbiterSuggestions?.join(', ') || '',
              referralId: data.referralId || '',
              teamSuggestions: data.teamSuggestions?.join(', ') || '',
            };
          });
        } catch (err) {
          merged.engagement = [];
        }

        // Fetch prospectfeedbackform subcollection if it exists
        try {
          const feedbackCol = collection(db, `Prospects/${prospectId}/prospectfeedbackform`);
          const feedbackSnapshot = await getDocs(feedbackCol);
          merged.feedback = feedbackSnapshot.docs.map(fd => {
            const data = fd.data();
            return {
              docId: fd.id,
              fullName: data.fullName || '',
              phoneNumber: data.phoneNumber || '',
              email: data.email || '',
              joinInterest: data.joinInterest || '',
              mentorName: data.mentorName || '',
              interestAreas: data.interestAreas?.join(', ') || '',
              selfGrowthUnderstanding: data.selfGrowthUnderstanding || '',
              understandingLevel: data.understandingLevel || '',
              communicationOptions: data.communicationOptions?.join(', ') || '',
              additionalComments: data.additionalComments || '',
            };
          });
        } catch (err) {
          merged.feedback = [];
        }

        mergedData.push(merged);
      }

      // Prepare Excel sheet
      const wb = XLSX.utils.book_new();
      const flatData = [];

      mergedData.forEach(m => {
        // Merge root + engagement
        if (m.engagement.length) {
          m.engagement.forEach(e => {
            flatData.push({ ...m, ...e, engagement: undefined, feedback: undefined });
          });
        } else if (m.feedback.length) {
          m.feedback.forEach(f => {
            flatData.push({ ...m, ...f, engagement: undefined, feedback: undefined });
          });
        } else {
          flatData.push(m);
        }
      });

      const ws = XLSX.utils.json_to_sheet(flatData);
      XLSX.utils.book_append_sheet(wb, ws, 'Prospects');
      XLSX.writeFile(wb, 'Prospects_Export.xlsx');

      setLoading(false);
    } catch (err) {
      console.error('Error fetching prospects:', err);
      setLoading(false);
    }
  };

  return (

    
      <button className='m-button-5' onClick={fetchProspects} disabled={loading}>
       Export
      </button>
 
  );
};

export default ExportProspects;
