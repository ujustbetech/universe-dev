import React, { useEffect, useState } from "react";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import Swal from "sweetalert2";

import HeaderNav from "../component/HeaderNav";
import Headertop from "../component/Header";

import MentorInfo from "../component/MentorInfo";
import ProspectForm from "../component/ProspectForm";

const UserAddProspect = () => {
  const [mentor, setMentor] = useState({});
  const [formData, setFormData] = useState({
    prospectName: "",
    prospectPhone: "",
    prospectEmail: "",
    occupation: "Service",
    hobbies: "",
    source: "close_connect",
  });

  const formattedDate = new Date().toISOString();

  const fetchMentorDetails = async (ujbCode) => {
    try {
      const docRef = doc(db, "usersdetail", ujbCode);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setMentor(snap.data());
      }
    } catch (err) {
      console.error("Failed to load mentor", err);
    }
  };

  useEffect(() => {
    const storedUJB = localStorage.getItem("mmUJBCode");
    if (storedUJB) fetchMentorDetails(storedUJB.trim());
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const { prospectName, prospectPhone, occupation, hobbies } = formData;

    if (!prospectName || !prospectPhone || !occupation || !hobbies) {
      Swal.fire("Error", "Please fill all fields!", "warning");
      return;
    }

    try {
      const prospectRef = collection(db, "Prospects");

      const prospectData = {
        ...formData,
        userType: "prospect",
        date: formattedDate,

        // Auto-fill mentor details
        orbiterName: mentor.Name,
        orbiterContact: mentor.MobileNo,
        orbiterEmail: mentor.Email,
        orbiterUJBCode: mentor.ujbCode,

        registeredAt: new Date(),
      };

      await addDoc(prospectRef, prospectData);

      Swal.fire("Success", "Prospect added successfully!", "success");

      setFormData({
        prospectName: "",
        prospectPhone: "",
        prospectEmail: "",
        occupation: "Service",
        hobbies: "",
        source: "close_connect",
      });
    } catch (err) {
      Swal.fire("Error", "Something went wrong!", "error");
    }
  };

  return (
    <main className="pageContainer">
      <Headertop />

      <section className="dashBoardMain">
        <div className="container">
          <div className="step-form-container">
            <h3 className="formtitle">Add Prospect</h3>
            <h2>Please fill the details of the person you want to add.</h2>

            <MentorInfo mentor={mentor} />

            <ProspectForm
              formData={formData}
              onChange={handleChange}
              onSubmit={handleSubmit}
            />
          </div>
        </div>

        <HeaderNav />
      </section>
    </main>
  );
};

export default UserAddProspect;
