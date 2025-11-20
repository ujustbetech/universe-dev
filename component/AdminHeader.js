import React from 'react'
import Image from 'next/image'
import {BiLogOutCircle} from 'react-icons/bi'
import {IoMdLogIn} from 'react-icons/io'
import Link from 'next/link'    
import Swal from 'sweetalert2'
import { COLLECTIONS } from "/utility_collection";
import Router from 'next/router'




const Header = () => {

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
              
              localStorage.removeItem("ucoreadmin");
              Router.push("/admin/admin-login");      
                
             
            }},
           )  
        
    }

    return (
        <header className="wrapper admin-header">      {/* header */}
        <div className="headerLeft"> 
                        
        </div>
        <div className="headerRight">
            
            {/* <button className="profile">
                <span>Logout</span>
            </button> */}
             {/* <div>
                <span><IoMdLogIn /></span>
                <Link href="/admin/login">
                     <a>Login</a>
                </Link>
               
           </div> */}
            <div>
                <span onClick={handleLogout} className='icon-rotate-90'><BiLogOutCircle /></span>
                Logout
           </div>
          
        </div>
     </header>
    )
}

export default Header
