import React,{useEffect,useState} from "react";
import {db} from "../../firebaseConfig";
import {
collection,
getDocs,
deleteDoc,
doc
} from "firebase/firestore";
import {useRouter} from "next/router";
import "../../src/app/styles/main.scss";
import Layout from "../../component/Layout";
import Swal from "sweetalert2";

const ManageCCReferral=()=>{

const [referrals,setReferrals]=useState([]);
const router=useRouter();


/* ================= FETCH ================= */

useEffect(()=>{
fetchReferrals();
},[]);

const fetchReferrals=async()=>{

const snap=await getDocs(collection(db,"CCReferral"));

const data=snap.docs.map(d=>({
id:d.id,
...d.data()
}));

setReferrals(data);

};


/* ================= DELETE ================= */

const handleDelete=async(id)=>{

const confirm=await Swal.fire({
title:"Delete Referral?",
showCancelButton:true
});

if(!confirm.isConfirmed)return;

await deleteDoc(doc(db,"CCReferral",id));

fetchReferrals();

};


/* ================= REDIRECT EDIT ================= */

const handleEdit=(id)=>{

router.push(`/ccreferral/${id}`);

};


/* ================= SORT ================= */

const sorted=referrals.sort(
(a,b)=>
(b.createdAt?.seconds||0)-
(a.createdAt?.seconds||0)
);


/* ================= RENDER ================= */

return(

<Layout>

<section className="c-userslist box">

<h2>Manage CC Referrals</h2>

<table className="table-class">

<thead>
<tr>
<th>#</th>
<th>Orbiter</th>
<th>Cosmo</th>
<th>Category</th>
<th>Item</th>
<th>Original%</th>
<th>Enhanced%</th>
<th>Final%</th>
<th>Status</th>
<th>Date</th>
<th>Actions</th>
</tr>
</thead>

<tbody>

{sorted.map((ref,index)=>(

<tr key={ref.id}>

<td>{index+1}</td>

<td>{ref.orbiter?.name||"-"}</td>

<td>{ref.cosmo?.name||"-"}</td>

<td>
{ref.category==="R"&&"Relation"}
{ref.category==="H"&&"Health"}
{ref.category==="W"&&"Wealth"}
{!ref.category&&"-"}
</td>

<td>{ref.itemName||"-"}</td>

<td>{ref.agreedPercentage?.originalPercent||0}</td>
<td>{ref.agreedPercentage?.enhancedPercent||0}</td>
<td>{ref.agreedPercentage?.finalAgreedPercent||0}</td>

<td>{ref.status||"Pending"}</td>

<td>
{ref.createdAt?.seconds?
new Date(
ref.createdAt.seconds*1000
).toLocaleString():"-"}
</td>

<td>

<button
className="btn-edit"
onClick={()=>handleEdit(ref.id)}
>
Edit
</button>

<button
className="btn-danger"
onClick={()=>handleDelete(ref.id)}
>
Delete
</button>

</td>

</tr>

))}

</tbody>

</table>

</section>

</Layout>

);

};

export default ManageCCReferral;
