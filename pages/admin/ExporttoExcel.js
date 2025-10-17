import { useEffect, useState } from 'react';
import { db } from '../../firebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx'; // Ensure the xlsx library is installed

const ExportToExcel = ({ eventId }) => {
  const [loading, setLoading] = useState(false);

  const fetchDataAndExport = async () => {
    setLoading(true);

    try {
      // Fetch the registered users for the specific event
      const registeredUsersCollection = collection(db, `MonthlyMeeting/${eventId}/registeredUsers`);
      const registeredUsersSnapshot = await getDocs(registeredUsersCollection);

      // Fetch user details for each registered user
      const userDetailsPromises = registeredUsersSnapshot.docs.map(async (docSnapshot) => {
        const userPhoneNumber = docSnapshot.data().phoneNumber;
        
        console.log('Fetching user details for:', userPhoneNumber);

        // Fetch user details from `/userdetails/{phoneNumber}` path
        const userDocRef = doc(db, 'userdetails', userPhoneNumber); // Phone number as document ID
        const userDocSnapshot = await getDoc(userDocRef);

        if (userDocSnapshot.exists()) {
          const userDetails = userDocSnapshot.data();
          const name = userDetails[" Name"] || 'N/A';
          const role = userDetails["Category"] || 'User';
          const ujb = userDetails["UJB Code"] || 'N/A';
          return { phone: userPhoneNumber, name , role , ujb}; // Return an object with phone and name
        } else {
          console.log(`User document not found for phone number: ${userPhoneNumber}`);
          return null; // Return null if the document doesn't exist
        }
      });

      // Wait for all user details to be fetched
      const userDetailsArray = await Promise.all(userDetailsPromises);

      // Filter out null entries (for users without details)
      const filteredUserDetails = userDetailsArray.filter(user => user !== null);

      // Prepare data for export
      const data = filteredUserDetails.map((user, index) => ({
        SrNo: index + 1,
        Name: user.name,
        Phone: user.phone,
        Role: user.role,
        UJB: user.ujb
      }));

      if (data.length === 0) {
        alert("No user details available for export.");
        setLoading(false);
        return;
      }

      // Convert the data to a worksheet and then to a workbook
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Registered Users');

      // Export the workbook to an Excel file
      XLSX.writeFile(workbook, 'Registered_Users.xlsx');
      alert("Data exported successfully!");

    } catch (error) {
      console.error('Error fetching data from Firestore:', error);
      alert("An error occurred while fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button className="m-button-7" onClick={fetchDataAndExport} disabled={loading}>
        {loading ? 'Exporting...' : 'Download XLS'}
      </button>
    </div>
  );
};

export default ExportToExcel;
