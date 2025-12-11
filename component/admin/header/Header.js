import React,{ useState, useEffect} from 'react'
import Image from 'next/image'
import { RiNotification3Line } from "react-icons/ri";
import { RiFullscreenFill } from "react-icons/ri";
import { RiFullscreenExitLine } from "react-icons/ri";
import { IoMdLogIn } from 'react-icons/io'
import Swal from 'sweetalert2';
import { Router } from 'next/router';



// image import
import searchimg from '../../../public/images/search.png'
import loupeimg from '../../../public/images/loupe.png'
import bellimg from "../../../public/images/bell.png";
import fullscreeninimg from '../../../public/images/fullscreenin.png'
import fullscreenoutimg from '../../../public/images/fullscreenout.png'
import notificationimg from '../../../public/images/notification.png'
import ujustbelogo from '../../../public/images/ujblogo.png'

function Header() { 

  const [AdminName, setAdminName] = useState("");


//   logout function
    const handleLogout=()=>{

        Swal.fire({
            title: 'Logout!',
            text: "Are you sure you want to logout?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes'
        }).then((result) => {
            if (result.isConfirmed) {
            Swal.fire({
                position: 'middle',
                icon: 'success',
                title: 'Logout',
                showConfirmButton: false,
                timer: 1500

            }) 
            
            localStorage.removeItem("AdminData");
            Router.push("/admin/login");      
                
            
            }
        },
        
        )
        
        
    
        
    }

    useEffect(() => {
    //     //get all document from firebase
        const isLogin = localStorage.getItem("AdminData");
        const AdminLoginData = JSON.parse(isLogin);    
        console.log(AdminLoginData.currentuser);
        setAdminName(AdminLoginData.currentuser);


        // const getAllData = async () => {
        //     console.log("test",isLogin);
        //     if(isLogin != null){
        //         setLoginStatus(false);
        //         // alert("check if you have already logged in!")
        //         Router.push('/content/addcontent');
        //     }

        //     else{    
        //         console.log(AdminLoginData);
        //         const name = AdminLoginData.currentuser;
        //         console.log(name);
        //         setAdminName(AdminLoginData.currentuser);
        //         setLoginStatus(true);   
        //     }

    //         // onSnapshot(collection(db, "AdminLoginTask", phoneNum), (snapshot) => {
    //         //     console.log("MM", snapshot);
    //         //     setUsers(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    //         //     setUsers(localStorage.getItem('ucore'));

    //         // })
    //     }
    //     getAllData();
    }, [])

 
  
  
    return (
        <header className="wrapper m-header">      {/* header */}
           <div className="headerLeft"> 
               {/* <div className="logo"><Image src={ujustbelogo} layout="responsive" alt="search_bar" ></Image></div>
               <div className="ham-menu-btn">
 
                       <span> </span>
                       <span>  </span>
                       <span>  </span>

                   
               </div> */}
               
           </div>
           <div className="headerRight">
               <button className="notifications-icon">
                   {/* <abbr></abbr> */}    {/*For notification update */}
                   <span><RiNotification3Line/></span>   
               </button>

               <button className='fullscreen-icon' >
                   <span id="fullscreen"><RiFullscreenFill/></span>
                   <span id="fullscreen"><RiFullscreenExitLine/></span>
                </button>


               <div className="profile">
                   {/* <span className='profile_circle'></span> */}
                   <span>{AdminName}</span>
                 <button onClick={handleLogout} className='logoutbtn'> <span><IoMdLogIn/></span> </button> 
                 
               </div>
               
               
           </div>
        </header>
    )
}

export default Header
