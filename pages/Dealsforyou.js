"use client";

import { useEffect,useState } from "react";
import {
getFirestore,
doc,
getDoc,
collection,
getDocs,
addDoc
} from "firebase/firestore";

import { app } from "../firebaseConfig";
import Headertop from "../component/Header";
import HeaderNav from "../component/HeaderNav";
import "../src/app/styles/user.scss";
import toast from "react-hot-toast";
import { COLLECTIONS } from "/utility_collection";

const db=getFirestore(app);

const DealsForYou=()=>{

const [deals,setDeals]=useState([]);
const [allItems,setAllItems]=useState([]);

const [orbiterDetails,setOrbiterDetails]=useState(null);

const [search,setSearch]=useState("");
const [filtered,setFiltered]=useState([]);
const [alternate,setAlternate]=useState([]);

const [selectedDeal,setSelectedDeal]=useState(null);
const [modalOpen,setModalOpen]=useState(false);
const [leadDescription,setLeadDescription]=useState("");



/* ================= LOAD USER ================= */

useEffect(()=>{

const stored=localStorage.getItem("mmUJBCode");
if(!stored)return;

const load=async()=>{

const snap=await getDoc(
doc(db,COLLECTIONS.userDetail,stored)
);

if(!snap.exists())return;

const data=snap.data();

setOrbiterDetails({
name:data.Name,
phone:data.MobileNo,
email:data.Email,
ujbCode:data.UJBCode
});

};

load();

},[]);



/* ================= FETCH APPROVED ================= */

useEffect(()=>{

const fetchDeals=async()=>{

const snapshot=await getDocs(
collection(db,"CCRedemption")
);

const approved=snapshot.docs
.map(d=>({id:d.id,...d.data()}))
.filter(d=>d.status==="Approved");

setDeals(approved);

let items=[];

approved.forEach(d=>{

if(d.selectedItem){
items.push(d.selectedItem);
}

if(d.multipleItems){
items=[...items,...d.multipleItems];
}

});

setAllItems(items);

};

fetchDeals();

},[]);



/* ================= SEARCH ================= */

useEffect(()=>{

if(!search){
setFiltered([]);
setAlternate([]);
return;
}

const match=deals.filter(d=>{

const items=[
...(d.selectedItem?[d.selectedItem]:[]),
...(d.multipleItems||[])
];

return items.some(i=>
i?.name?.toLowerCase()
.includes(search.toLowerCase())
);

});

if(match.length>0){
setFiltered(match);
setAlternate([]);
}else{
setAlternate(deals.slice(0,5));
setFiltered([]);
}

},[search,deals]);



/* ================= CARD CLICK ================= */

const openReferralModal=(deal)=>{

setSelectedDeal(deal);
setModalOpen(true);

};



/* ================= PASS REFERRAL ================= */

const handlePassReferral = async () => {

if(!leadDescription.trim()){
toast.error("Enter Requirement");
return;
}

try{

/* ================= COSMO FORMAT FIX ================= */

const formattedCosmo = selectedDeal?.cosmo
?{
name:selectedDeal.cosmo.Name || "",
phone:selectedDeal.cosmo.MobileNo || "",
email:selectedDeal.cosmo.Email || "",
ujbCode:selectedDeal.cosmo.ujbCode || ""
}
:null;



await addDoc(collection(db,"CCReferral"),{

referralSource:"CC",
referralType:"CCDeal",
status:"Pending",
createdAt:new Date(),

orbiter:orbiterDetails,
cosmo:formattedCosmo,   // ✅ NOW CORRECT FORMAT

category:selectedDeal.redemptionCategory||null,

itemType:selectedDeal.mode||null,

itemName:
selectedDeal.selectedItem?.name||
selectedDeal.multipleItems?.map(i=>i.name).join(", "),

itemDescription:
selectedDeal.selectedItem?.description||
selectedDeal.multipleItems?.map(i=>i.description).join(", "),

itemImage:
selectedDeal.selectedItem?.imageURL||
selectedDeal.multipleItems?.map(i=>i.imageURL)[0],

leadRequirement:leadDescription,

ccModel:selectedDeal.ccModel||null,
agreedPercentage:selectedDeal.agreedPercentage||null

});

toast.success("CC Referral Passed");

setModalOpen(false);
setLeadDescription("");
setSelectedDeal(null);

}catch(err){
toast.error("Error Passing Referral");
}

};




/* ================= RENDER ================= */

const renderCard=(deal)=>{

const name=
deal.selectedItem?.name||
deal.multipleItems?.map(i=>i.name).join(", ");

const desc=
deal.selectedItem?.description||
deal.multipleItems?.map(i=>i.description).join(", ");

const img=
deal.selectedItem?.imageURL||
deal.multipleItems?.map(i=>i.imageURL)[0];

return(

<div
key={deal.id}
className="deal-card"
onClick={()=>openReferralModal(deal)}
>

{img&&(
<img
src={img}
className="deal-img"
alt={name}
/>
)}

<h3>{name}</h3>

<p className="deal-desc">{desc}</p>

<p>{deal.cosmo?.Name}</p>

</div>

);

};



return(

<main className="pageContainer">

<Headertop/>

<section className="HomepageMain">

<div className="container pageHeading">

<h1>CC Referral</h1>

<input
type="text"
placeholder="Search Product / Service"
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>

</div>



{/* ALL PRODUCTS */}

{!search&&(
<section className="deals-grid">
{deals.map(renderCard)}
</section>
)}



{/* MATCH */}

{filtered.length>0&&(
<section className="deals-grid">
{filtered.map(renderCard)}
</section>
)}



{/* ALTERNATE */}

{alternate.length>0&&(

<>
<p style={{textAlign:"center"}}>
Requested CosmOrbiter not available.
Showing alternate CC Listed CosmOrbiters
</p>

<section className="deals-grid">
{alternate.map(renderCard)}
</section>
</>

)}

<HeaderNav/>

</section>



{/* MODAL */}

{modalOpen&&(

<div className="ref-modal-overlay">

<div className="ref-modal-content">

<h3>
{selectedDeal?.selectedItem?.name||
selectedDeal?.multipleItems?.map(i=>i.name).join(", ")}
</h3>

<textarea
placeholder="Requirement / Location / Timeline"
value={leadDescription}
onChange={(e)=>setLeadDescription(e.target.value)}
/>

<button onClick={handlePassReferral}>
Submit Referral
</button>

<button onClick={()=>setModalOpen(false)}>
Cancel
</button>

</div>

</div>

)}

</main>

);

};

export default DealsForYou;
