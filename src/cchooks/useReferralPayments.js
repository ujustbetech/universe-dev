import { useState, useMemo } from "react";
import {
doc,
updateDoc,
Timestamp,
arrayUnion,
increment
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { COLLECTIONS } from "../../utility_collection";

const TDS_RESIDENT = 0.05;
const TDS_NRI = 0.20;

const round2=(n)=>Math.round(n*100)/100;

/* ============================================================
🟣 CC RECIPROCATION ENGINE (AS PER SOP)
============================================================ */

const calculateCCReciprocation = (
referralData,
dealValue,
paidAmount=0
)=>{

const model =
referralData?.ccModel?.type;

const discount =
Number(referralData?.ccModel?.discountPercent||0);

const percent =
Number(
referralData?.agreedPercentage?.finalAgreedPercent||0
);

let base = Number(dealValue||0);

/* ================= DISCOUNT MODEL ================= */

if(model==="DISCOUNT"){
base = base - (base * discount / 100);
}

/* ================= FREE OFFER ================= */

if(model==="FREE_OFFER"){
base = Number(paidAmount||0);
}

/* ================= AGREED ================= */

const agreed =
(base * percent)/100;

/* ================= SPLIT ================= */

return{
orbiter:round2(agreed*0.5),
ujustbe:round2(agreed*0.5)
};

};

/* ============================================================
HOOK
============================================================ */

export default function useReferralPayments({
id,
referralData,
payments,
setPayments,
dealLogs
}){

const [showAddPaymentForm,setShowAddPaymentForm]=useState(false);
const [isSubmitting,setIsSubmitting]=useState(false);

/* ================= SAFE PAYMENTS ================= */

const safePayments = useMemo(()=>{
if(Array.isArray(payments))return payments;
if(payments&&typeof payments==="object")
return Object.values(payments);
return[];
},[payments]);

/* ================= AGREED ================= */

const agreedAmount = useMemo(()=>{
if(!Array.isArray(dealLogs)||dealLogs.length===0)return 0;
const lastDeal=dealLogs[dealLogs.length-1];
return Number(lastDeal?.agreedAmount||0);
},[dealLogs]);

const cosmoPaid = safePayments
.filter(p=>p?.meta?.isCosmoToUjb)
.reduce(
(s,p)=>s+
Number(p?.grossAmount??
p?.amountReceived??0),0
);

const agreedRemaining =
Math.max(agreedAmount-cosmoPaid,0);

/* ============================================================
COSMO → UJB PAYMENT
============================================================ */

const [newPayment,setNewPayment]=useState({
amountReceived:"",
modeOfPayment:"",
transactionRef:"",
paymentDate:"",
tdsDeducted:false,
tdsRate:10
});

const updateNewPayment=(k,v)=>
setNewPayment(p=>({...p,[k]:v}));

const openPaymentModal=()=>setShowAddPaymentForm(true);
const closePaymentModal=()=>setShowAddPaymentForm(false);

/* ============================================================
SAVE COSMO PAYMENT
============================================================ */

const handleSavePayment=async()=>{

if(!id||isSubmitting)return;

const amount=Number(newPayment.amountReceived||0);
if(amount<=0)return alert("Enter valid amount");

if(!newPayment.paymentDate)
return alert("Select payment date");

setIsSubmitting(true);

try{

const lastDeal=dealLogs[dealLogs.length-1];

let dist;

/* ============================================================
🟣 CC REFERRAL SOP LOGIC
============================================================ */

if(referralData?.referralSource==="CC"){

dist = calculateCCReciprocation(
referralData,
lastDeal?.dealValue,
amount
);

}else{

/* ================= REGULAR ================= */

const ratio =
amount/Number(lastDeal?.agreedAmount||1);

dist={
orbiter:round2(
(lastDeal?.orbiterShare||0)*ratio
),
orbiterMentor:round2(
(lastDeal?.orbiterMentorShare||0)*ratio
),
cosmoMentor:round2(
(lastDeal?.cosmoMentorShare||0)*ratio
),
ujustbe:round2(
(lastDeal?.ujustbeShare||0)*ratio
)
};

}

/* ================= TDS ================= */

const tdsRate =
newPayment.tdsDeducted?
Number(newPayment.tdsRate||0):0;

const tdsAmount =
round2((amount*tdsRate)/100);

const netAmount =
round2(amount-tdsAmount);

/* ================= ENTRY ================= */

const entry={

paymentId:`COSMO-${Date.now()}`,
paymentFrom:"CosmoOrbiter",
paymentTo:"UJustBe",

grossAmount:amount,
tdsAmount,
tdsRate,
amountReceived:netAmount,

distribution:
referralData?.referralSource==="CC"
?
{
orbiter:dist.orbiter,
ujustbe:dist.ujustbe
}
:
dist,

paymentDate:newPayment.paymentDate,
modeOfPayment:newPayment.modeOfPayment,
transactionRef:newPayment.transactionRef,
createdAt:Timestamp.now(),

meta:{
isCosmoToUjb:true,
tdsDeducted:newPayment.tdsDeducted,
isCC:
referralData?.referralSource==="CC"
}

};

/* ================= SAVE ================= */

await updateDoc(
doc(db,COLLECTIONS.ccreferral,id),
{
payments:arrayUnion(entry),
ujbBalance:increment(netAmount),
tdsReceivable:increment(tdsAmount)
}
);

setPayments(prev=>[...prev,entry]);
closePaymentModal();

}catch(err){
console.log(err);
alert("Payment failed");
}
finally{
setIsSubmitting(false);
}

};

/* ============================================================
EXPORT
============================================================ */

return{
agreedAmount,
cosmoPaid,
agreedRemaining,
showAddPaymentForm,
isSubmitting,
newPayment,
updateNewPayment,
openPaymentModal,
closePaymentModal,
handleSavePayment,
payments:safePayments
};

}
