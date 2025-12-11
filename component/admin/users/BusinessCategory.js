import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { auth } from '../../../firebaseConfig'
import { signInWithPopup, OAuthProvider, getAuth, signOut } from 'firebase/auth';
import { collection, ref, push,addDoc, setDoc, doc, docs, getDocs, arrayUnion,getDoc,updateDoc,Timestamp } from "firebase/firestore";
import { getFirestore ,onSnapshot} from "firebase/firestore";
import Router from 'next/router';

const authlog = getAuth();

const db = getFirestore();

function BusinessCategory() {

    const [businessCategory,setBusinessCategory]=useState("");
    const [listCategory,setlistcategory]=useState("");
    const [Bcategorydata, setBcategorydata] = useState([]);
    const usersCollectionRef = collection(db, "BusinessCategory");


    // add business category in database 
    const HandleAddBusinessCategory=async(e)=>{
        const data={
            businessCategory:businessCategory,
        }

        await addDoc(usersCollectionRef,data);
        alert("business created successfully!");
        console.log("businessCategory data:", data);  
        setBusinessCategory("");

    }

    useEffect(() => {
        const getContent = async () => {
          const data = await getDocs(usersCollectionRef);
          // onSnapshot(collection(db, "dewdropusers3"), (snapshot) => {
          //   console.log("Suraj", snapshot);
          //   setUsers(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
          // })
          setBcategorydata(data.docs.map((doc) => ({ ...doc.data(), id:doc.id })));
          console.log(data);
        };
    
        getContent();
      }, []);

  return (
    <section className='c-form  box'>
    <h1> Add Business Category</h1>
        <ul>

            {/* business category Name */}
            <li className='form-row'>
                <h4 htmlFor="b1">Business Category</h4>
                <div className='multipleitem'>
                    <input type="text"
                    placeholder='Enter Business Category eg. IT, Finance, Carpenter, Wholesaler'
                    name="businesscategory"
                    id="b1" 
                    value={businessCategory}
                    onChange={( event ) => {setBusinessCategory(event.target.value)}}
                    required >
                    </input> 
                
                    {/* <span class="valid-feedback">Looks good!</span> */}        
                </div>
            </li>
            
        {/* submit and reset btn */}  {/* submit & reset button  */}
        <li className='form-row'>   
            <div>
                <button className='submitbtn' onClick={HandleAddBusinessCategory}>Submit</button>
            
        
                <button className='resetbtn'>Reset</button>
            </div>    
            </li>
        </ul>




    

    </section>
  )
}

export default BusinessCategory