"use client";

import React,{useEffect,useState} from "react";
import {
collection,
updateDoc,
doc,
query,
orderBy,
onSnapshot
} from "firebase/firestore";
import {db} from "../../firebaseConfig";
import Layout from "../../component/Layout";
import Swal from "sweetalert2";
import "../../src/app/styles/main.scss";

const RedemptionRequests=()=>{

const[ccRequests,setCcRequests]=useState([]);
const[searchTerm,setSearchTerm]=useState("");
const[filterStatus,setFilterStatus]=useState("All");


/* ================= FETCH ================= */

useEffect(()=>{

const q=query(
collection(db,"CCRedemption"),
orderBy("createdAt","desc")
);

const unsubscribe=onSnapshot(q,(snap)=>{
setCcRequests(
snap.docs.map(d=>({
id:d.id,
...d.data()
}))
);
});

return()=>unsubscribe();

},[]);



/* ================= APPROVE ================= */

const handleApprove=async(request)=>{

const {value:category}=await Swal.fire({

title:"Select Category",

input:"select",

inputOptions:{
R:"Relation",
H:"Health",
W:"Wealth"
},

inputPlaceholder:"Select Category",
showCancelButton:true

});

if(!category)return;

await updateDoc(doc(db,"CCRedemption",request.id),{

status:"Approved",
redemptionCategory:category,
updatedAt:new Date()

});

Swal.fire("Approved!","Deal Live","success");

};



/* ================= EDIT ================= */

const handleEdit=async(request)=>{

const {value:category}=await Swal.fire({

title:"Edit Category",

input:"select",

inputOptions:{
R:"Relation",
H:"Health",
W:"Wealth"
},

inputValue:request.redemptionCategory,
showCancelButton:true

});

if(!category)return;

await updateDoc(doc(db,"CCRedemption",request.id),{

redemptionCategory:category,
updatedAt:new Date()

});

Swal.fire("Updated!","Category Updated","success");

};



/* ================= REJECT ================= */

const handleReject=async(id)=>{

const confirm=await Swal.fire({
title:"Reject?",
showCancelButton:true
});

if(!confirm.isConfirmed)return;

await updateDoc(doc(db,"CCRedemption",id),{
status:"Rejected",
updatedAt:new Date()
});

Swal.fire("Rejected","","success");

};



/* ================= FILTER ================= */

const filtered=ccRequests.filter(r=>{

const matchSearch=
r.cosmo?.Name
?.toLowerCase()
.includes(searchTerm.toLowerCase());

const matchStatus=
filterStatus==="All"||
r.status===filterStatus;

return matchSearch&&matchStatus;

});



/* ================= ITEM NAME ================= */

const getItemName=(r)=>{

if(r.mode==="all") return "All";

if(r.mode==="single")
return r.selectedItem?.name||"-";

if(r.mode==="multiple")
return r.multipleItems
?.map(i=>i.name)
.join(", ");

return "-";

};



return(

<Layout>

<section className="admin-profile-container">

<h2>CC Deal Management</h2>

<input
placeholder="Search Cosmo"
value={searchTerm}
onChange={(e)=>setSearchTerm(e.target.value)}
/>

<select
value={filterStatus}
onChange={(e)=>setFilterStatus(e.target.value)}
>
<option value="All">All</option>
<option value="Requested">Requested</option>
<option value="Approved">Approved</option>
<option value="Rejected">Rejected</option>
</select>



<table className="admin-table">

<thead>
<tr>
<th>Cosmo</th>
<th>Product</th>
<th>Original %</th>
<th>Enhanced %</th>
<th>Final %</th>
<th>Category</th>
<th>Status</th>
<th>Action</th>
</tr>
</thead>

<tbody>

{filtered.map(r=>(

<tr key={r.id}>

<td>{r.cosmo?.Name}</td>

<td>{getItemName(r)}</td>

<td>{r.agreedPercentage?.originalPercent??"-"}</td>
<td>{r.agreedPercentage?.enhancedPercent??"-"}</td>
<td>{r.agreedPercentage?.finalAgreedPercent??"-"}</td>

<td>
{r.redemptionCategory==="R"&&"Relation"}
{r.redemptionCategory==="H"&&"Health"}
{r.redemptionCategory==="W"&&"Wealth"}
{!r.redemptionCategory&&"-"}
</td>

<td>{r.status}</td>

<td>

{r.status==="Requested"&&(
<>
<button
className="btn-success"
onClick={()=>handleApprove(r)}
>
Approve
</button>

<button
className="btn-danger"
onClick={()=>handleReject(r.id)}
>
Reject
</button>
</>
)}

{r.status==="Approved"&&(
<button
className="btn-edit"
onClick={()=>handleEdit(r)}
>
Edit
</button>
)}

</td>

</tr>

))}

</tbody>

</table>

</section>

</Layout>

);

};

export default RedemptionRequests;
