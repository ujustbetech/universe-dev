import React, { useEffect, useState } from 'react';
import { auth } from '../../../firebaseConfig'
import firebaseApp from '../../../firebaseConfig';
import { signInWithPopup, OAuthProvider, getAuth, signOut } from 'firebase/auth';
import { collection, push, addDoc, setDoc, doc, docs, getDocs, arrayUnion, getDoc, updateDoc, Timestamp, orderBy } from "firebase/firestore";
import { getFirestore, onSnapshot } from "firebase/firestore";
import { getStorage, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import Router from 'next/router';
import Link from 'next/link'

const authlog = getAuth();
const db = getFirestore();
const storage = getStorage();

import { FiEdit } from 'react-icons/fi';

const ContentList=()=> {
    
    const [contentListData, setcontentListData] = useState([]);
    const [contentdetail, setcontentdetail] = useState("");
   
    const [username, setusername] = useState("");


    useEffect(() => {

        // //localhost
        const isLogin = localStorage.getItem("userdetail");
        const usersDetails = JSON.parse(isLogin);
        console.log(isLogin);
        // const userName = usersDetails.username;
        // setusername(usersDetails.username);
    

        // get all data from firebase
        const getAllDocument = async () => {
            onSnapshot(collection(db,"ContentData"), (snapshot) => {
                console.log("ContentDataList", snapshot);
                setcontentListData(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
            });
               console.log(contentListData);
        }
    getAllDocument();
    
    // const q = query(collection(db,phoneNum), orderBy('created', 'desc'))
    // onSnapshot(q, (querySnapshot) => {
    //   setTasks(querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data()})))    
    // })
    // console.log();
    }, [])
  

  return (
    <>
         {/* content listing table  */}
    <section className='box userlisting'>
         <h2> Content Listing </h2>
         <table className='table-class'>
             <thead>
                <tr>
                        <th>Sr No.</th>
                        <th>Partner Name</th>
                        <th>Partner Type</th>
                        <th>Content Name</th>
                        <th>Content Discription</th>
                        <th>Content Format</th>
                        <th>Content Type</th>
                        <th>Content Images</th>
                        <th>Content Hastag</th>
                        <th>Video Url</th>
                        <th>Total Contribution</th>
                        <th>Total View </th>
                        <th>total Like</th>
                        <th>Status</th>
                        <th>Action</th>

                </tr>
         </thead>

         <tbody>

{/* // map the function */}
                {
                contentListData && contentListData.map((contentdetails, key=i) => {
                    console.log("contendata", contentdetails);
                    return (

                                <tr key={key}>
                                    <td>{key + 1}</td>
                                    <td>{contentdetails.partnerNamelp}</td>
                                    <td>{contentdetails.partnerDesig}</td>
                                    <td>{contentdetails.contentName}</td>
                                    <td>{contentdetails.contDiscription}</td>
                                    <td>{contentdetails.contentFormat}</td>
                                    <td>{contentdetails.contentType}</td>  
                                    <td>{contentdetails.contentFileImages}</td>
                                    <td>{contentdetails.inputTag}</td>
                                    <td>{contentdetails.videoUrl}</td>
                                    <td>{contentdetails.totalCp}</td>
                                    <td>{contentdetails.totalViews}</td>
                                    <td>{contentdetails.totallike}</td>
                                    <td>{contentdetails.switchValue}</td>
                            
                                    <td>
                                      <Link
  href={`/content/contentdetails/${contentdetails.id}`}
  className="editaction"
>
  Edit <FiEdit />
</Link>

                                </td>  
                                    
                                
                                </tr>                           
                    )

                })
                }

        </tbody>

         {/* <tbody>
                {contentList && contentList.map((contentdetail,key=i)=>{
                        // console.log("Content all data", contentdetail);
 
                        <tr key={key}>
                            <td>{key + 1}</td>
                                {/* <td>{username}</td> */}
                                {/* <td>{contentdetail.partnerDesig}</td>
                                <td>{contentdetail.partnerNamelp}</td> */}
                                {/* <td>{contentdetail.contentFormat}</td>
                                <td>{contentdetail.contentType}</td>
                                <td>{contentdetail.contDiscription}</td>
                                <td>{contentdetail.inputTag}</td>
                            
                                <td>{contentdetail.lpProfile}</td>
                                <td>{contentdetail.totalCp}</td>
                                <td>{contentdetail.totalViews}</td>
                                <td>{contentdetail.totalViews}</td>
                                <td>{contentdetail.videoUrl}</td>
                                <td>{contentdetail.videoUrl}</td>
                                <td>{contentdetail.clientlogo}</td>
                                <td>{contentdetail.businessLogo}</td>
                                <td>{contentdetail.businessLogo}</td> */}
                    
                                {/* <td>
                                        <Link href={"/content/contentdetails/[cid]"} as={"/content/contentdetails/" + contentdetail.id}>
                                            <a className='editaction'>Edit<FiEdit/></a>
                                        </Link>
                                </td>   */}
{/*                             
                        
                        </tr>
                            
            

                })}
        </tbody> */} 

             
         </table>
        </section>
    </>
  )
}

export default ContentList