import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { auth } from '../../../firebaseConfig'
import { signInWithPopup, OAuthProvider, getAuth, signOut } from 'firebase/auth';
import { collection, ref, push,addDoc, setDoc, doc, docs, getDocs, arrayUnion,getDoc,updateDoc,Timestamp } from "firebase/firestore";
import { getFirestore ,onSnapshot} from "firebase/firestore";
import Router from 'next/router';
const authlog = getAuth();

const db = getFirestore();


const ContentCategory = () => {
const [contentCategory,setcontentCategory]=useState("");
const [listCategory,setlistcategory]=useState("");
const [ContentCategoryData, setContentCategoryData] = useState([]);
const usersCollectionRef = collection(db, "ContentCategory");


const HandleAddContentCategory=async(e)=>{
    const data={

        contentCategory:contentCategory,
    }

    // const cityRef = doc(db,"dewdropAdmin");
    await addDoc(usersCollectionRef,data);
    // addDoc(cityRef, data, { merge: true });
    console.log("data contentCategory:", data);  
    setcontentCategory("");  

}

useEffect(() => {
    const getContent = async () => {
      const data = await getDocs(usersCollectionRef);
      // onSnapshot(collection(db, "dewdropusers3"), (snapshot) => {
      //   console.log("Suraj", snapshot);
      //   setUsers(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      // })
      setContentCategoryData(data.docs.map((doc) => ({ ...doc.data(), id:doc.id })));
      console.log(data);
    };

    getContent();
  }, []);



    return (
    <>
        <section className='c-form  box'>
        <h1> Add Content Category</h1>
        <ul>

             {/* Event Name */}
             <li className='form-row'>
                <h4 htmlFor="validationCustom01">Content Category</h4>
                <div className='multipleitem'>
                    <input type="text"
                     placeholder='Enter Content Category eg. Tech, Politics'
                     name="eventName"
                     id="validationCustom01" 
                     value={contentCategory}
                     onChange={( event ) => {setcontentCategory(event.target.value)}}
                     required >
                    </input> 
                   
                    {/* <span class="valid-feedback">Looks good!</span> */}        
                </div>
            </li>
            
        {/* submit and reset btn */}  {/* submit & reset button  */}
        <li className='form-row'>   
            <div>
                <button className='submitbtn' onClick={HandleAddContentCategory}>Submit</button>
            
         
                <button className='resetbtn'>Reset</button>
            </div>    
            </li>
        </ul>




        

        </section>


        <section className='box userlisting'>
        <h2>
                Content Category List
        </h2>
        <table>
            <thead>
                <tr>
            
                <th>Created By</th>
                <th>Created Time</th>
                <th>category Name</th>
                <th>Action </th>
                <th>Created By</th>
                <th>Created Time</th>
                <th>category Name</th>
                <th>Action </th>
            
                </tr>
        </thead>
            <tbody>
                <tr>
                
                    <td>Soni</td>
                    <td>12:00 am</td>
                    <td>djbsj</td>
                    <td>edit delete</td>
                    <td>Soni</td>
                    <td>12:00 am</td>
                    <td>djbsj</td>
                    <td>edit delete</td>
                    
                
                </tr>
                      
        </tbody>
        </table>
        </section>
   

   </>
    );
}

export default ContentCategory
