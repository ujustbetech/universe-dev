"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  limit
} from "firebase/firestore";

import { db } from "../../firebaseConfig";
import Layout from "../../component/Layout";
import "../../src/app/styles/main.scss";

const Profiling = () => {

  const [approvedDeals, setApprovedDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [leadDescription, setLeadDescription] = useState("");

  /* ================= LOAD APPROVED CC DEALS ================= */

  useEffect(() => {

    const fetchDeals = async () => {

      const q = query(
        collection(db,"CCRedemption"),
        where("status","==","Approved")
      );

      const snap = await getDocs(q);

      setApprovedDeals(
        snap.docs.map(d=>({
          id:d.id,
          ...d.data()
        }))
      );

    };

    fetchDeals();

  },[]);

  /* ================= REFERRAL ID ================= */

  const generateCCReferralId = async () => {

    const now = new Date();
    const y1 = now.getFullYear() % 100;
    const y2 = (now.getFullYear()+1)%100;

    const prefix=`CCRef/${y1}-${y2}/`;

    const q=query(
      collection(db,"ccreferral"),
      orderBy("referralId","desc"),
      limit(1)
    );

    const snap=await getDocs(q);

    let last=0;

    if(!snap.empty){

      const lastId=snap.docs[0].data().referralId;
      const match=lastId?.match(/\/(\d{4})$/);

      if(match) last=parseInt(match[1],10);

    }

    return `${prefix}${String(last+1).padStart(4,"0")}`;

  };

  /* ================= SUBMIT ================= */

 const handleSubmit=async()=>{

  if(!selectedDeal){
    alert("Select CC Deal");
    return;
  }

  if(!leadDescription.trim()){
    alert("Enter Requirement");
    return;
  }

  /* ================= CC ELIGIBILITY CHECK ================= */

  const orbiterUjb =
    selectedDeal?.orbiter?.ujbCode;

  const eligible =
    await checkOrbiterCCBalance(orbiterUjb);

  if(!eligible){

    alert(
      "Minimum 250 CC Points required to create CC Referral"
    );

    return;
  }

  /* ================= CREATE REFERRAL ================= */

  try{

    const referralId=
      await generateCCReferralId();

    await addDoc(
      collection(db,"ccreferral"),{

      referralId,
      referralType:"CC",
      referralSource:"CC",

      status:"Pending",
      createdAt:serverTimestamp(),

      /* ================= LOCKED CC DATA ================= */

      ccRedemptionId:selectedDeal.id,
      category:selectedDeal.redemptionCategory,

      agreedPercentage:selectedDeal.agreedPercentage,
      ccModel:selectedDeal.ccModel,

      /* ================= USERS ================= */

      orbiter:{
        name:selectedDeal.orbiter?.name,
        phone:selectedDeal.orbiter?.phone,
        email:selectedDeal.orbiter?.email,
        ujbCode:selectedDeal.orbiter?.ujbCode
      },

      cosmo:{
        name:selectedDeal.cosmo?.name,
        phone:selectedDeal.cosmo?.phone,
        email:selectedDeal.cosmo?.email,
        ujbCode:selectedDeal.cosmo?.ujbCode
      },

      /* ================= SERVICE ================= */

      itemType:selectedDeal.itemType,
      itemName:selectedDeal.itemName,
      itemDescription:selectedDeal.itemDescription,

      leadDescription,

      /* ================= CC TAG ================= */

      ccTagged:true

    });

    alert("CC Referral Created Successfully");

    setSelectedDeal(null);
    setLeadDescription("");

  }catch(err){

    console.error(err);
    alert("Error Creating CC Referral");

  }

};

  /* ================= UI ================= */

  return(

    <Layout>

      <section className="admin-profile-container">

        <h2>Create CC Referral</h2>

        <div className="form-group">

          <label>Select Approved CC Deal</label>

          <select
            onChange={(e)=>{

              const deal=approvedDeals.find(
                d=>d.id===e.target.value
              );

              setSelectedDeal(deal);

            }}
          >

            <option>Select</option>

            {approvedDeals.map(d=>(

              <option key={d.id} value={d.id}>

                {d.itemName} | {d.cosmo?.name}

              </option>

            ))}

          </select>

        </div>

        {selectedDeal&&(

          <div className="cc-info-box">

            <p>
              Final Agreed % :
              {selectedDeal.agreedPercentage?.finalAgreedPercent}%
            </p>

            <p>
              Model :
              {selectedDeal.ccModel?.type}
            </p>

          </div>

        )}

        <textarea
          placeholder="Requirement"
          value={leadDescription}
          onChange={(e)=>setLeadDescription(e.target.value)}
        />

        <button
          className="btn-submit"
          onClick={handleSubmit}
        >
          Submit CC Referral
        </button>

      </section>

    </Layout>

  );

};

export default Profiling;
