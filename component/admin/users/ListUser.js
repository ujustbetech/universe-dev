import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { auth } from '../../../firebaseConfig'
import firebaseApp from '../../../firebaseConfig';
import { signInWithPopup, OAuthProvider, getAuth, signOut } from 'firebase/auth';
import { collection, push, addDoc, setDoc, doc, docs, getDocs, arrayUnion, getDoc, updateDoc, Timestamp, orderBy } from "firebase/firestore";
import { getFirestore, onSnapshot } from "firebase/firestore";
import { getStorage, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import Router from 'next/router';
import Swal from 'sweetalert2';
const authlog = getAuth();
const db = getFirestore();
const storage = getStorage();

import Link from 'next/link'
import { FiEdit } from 'react-icons/fi';

const ListUser = () => {

    const [userData, setUserdata] = useState([]);
    const [username, setusername] = useState("");
    const [userdetail, setUserdetail] = useState('');
    const [services, setservices] = useState([]);

const handlebusinessimgView=(businessLogo)=>{
    console.log("pop", businessLogo);
        Swal.fire({
        // title: 'Sweet!',
        // text: 'Modal with a custom image.',
        imageUrl: businessLogo,
        imageWidth: 400,
        
        imageAlt: 'Custom image',
        })
}
const handleprofileView=(lpProfileimg)=>{
    console.log("pop", lpProfileimg);
        Swal.fire({
        // title: 'Sweet!',
        // text: 'Modal with a custom image.',
        imageUrl: lpProfileimg,
        imageWidth: 400,
        
        imageAlt: 'Custom image',
        })
}

const handleImageView = (clientimg) => {

    Swal.fire({
      // title: ,  
      imageUrl: clientimg,
      imageWidth: 400,
      className: "styleTitle",
      imageAlt: 'Custom image',
    })
  }



    useEffect(() => {

        // //localhost
        const isLogin = localStorage.getItem("userdetail");
        const usersDetails = JSON.parse(isLogin);
        console.log(isLogin);
        // const userName = usersDetails.username;
        //  console.log(userName);
   
    

        // get all data from firebase
        const getAllDocument = async () => {
            onSnapshot(collection(db,"UsersData"), (snapshot) => {
                console.log("UserData", snapshot);
                setUserdata(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
                // setusername(usersDetails.username);
            })
            // console.log(username);
        }

    getAllDocument();

    
    
    }, [])
  
    return (
    <>
         {/* user listing table  */}
        <section className=' userlisting box'>
         <h2> User Listing </h2>
         <table className='table-class'>
             <thead>
                <tr>
                        <th>Sr No.</th>
                        <th>Partner Name</th>
                        <th>Partner Type</th>
                        <th>business Name</th>
                        <th>business Category</th>
                        <th>Business Logo</th>
                        <th>Client Logo</th>
                        <th>Gallary Images</th>
                        <th>Partner Profile</th>
                        <th>Content Video/Images</th>
                        <th>USP</th>
                        {/* <th>Products</th> */}
                        <th>Business Details</th>
                        {/* <th>Services Details</th> */}

                        <th>Action</th>

                </tr>
         </thead>
         <tbody>

                {
                    userData && userData.map((userdetail, key=i) => {
                        console.log("user all data", userData);
                        return (

                                    <tr key={key}>
                                        <td>{key + 1}</td>
                                        {/* <td>{username}</td> */}
                                        <td>{userdetail.partnerName}</td>
                                        <td>{userdetail.PartnerType}</td>
                                        <td>{userdetail.businessName}</td>
                                        <td  className=''>{userdetail.BusinessCategory}</td> 
                                        <td><div  onClick={() => handlebusinessimgView(userdetail.businessLogo)}><img  src={userdetail.businessLogo}/></div></td> 
                                        {/* <td><img src={userdetail.clientLogo}/></td> */}
                                        <td className='clientlogoimg'>{userdetail.clientLogo && userdetail.clientLogo.map((clientimg, i) => <div key={i} onClick={() => handleImageView(clientimg)} className='admin-imgfile'><img src={clientimg}/></div>)}</td>
                                        <td><img src={userdetail.gallary}/></td>
                                        <td><div onClick={() => handleprofileView(userdetail.lpProfileimg)}><img src={userdetail.lpProfileimg}/></div></td> 
                                        <td><div><iframe  src={userdetail.videoUrl} width={300} height={150} frameborder="0" allowfullscreen="allowfullscreen" /></div></td>
                                        <td dangerouslySetInnerHTML={{ __html: userdetail.lpUsp }} ></td>
                                        <td>{userdetail.businessDetail}</td>
                                        {/* <td>{userdetail.businessName}</td> */}
                                        {/* <td>{ userdetail.services && userdetail.services.map((c, i)=>{
                                            // console.log(c.serviceDisc),
                                            <div>sfnksjn</div>
                                         
                                        })}</td>  */}
                                      
                                       
                                       
                                    
                                       
                                        <td>
                                           <Link
  href={`/userdetails/${userdetail.id}`}
  className="editaction"
>
  <FiEdit /> Edit
</Link>

                                        </td>
                                        
                                       
                                    </tr>                           
                        )

                    })
                }

               
        </tbody>

             
         </table>
        </section>
    </>
    )
}

export default ListUser


