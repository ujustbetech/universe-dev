import React, { useState } from 'react'
import Image from 'next/image'
import Header from './AdminHeader'
import { COLLECTIONS } from "/utility_collection";
import Navbar from './Navbar'
import ujustbelogo from '../public/images/ujblogo.png'


const Layout = ({ children }) => {

    const [navChange, setnavChange] = useState(false);
    const [name, setName] = useState("false");

    
    return (
       <>
        <div className={navChange ? 'logoContainer expand' : 'logoContainer' }>
             <div className="logo"><Image src={ujustbelogo} width={65} height={65} alt="search_bar" ></Image></div>
            <div className="ham-menu-btn"  onClick={() => setnavChange(!navChange)}>
                <span> </span>
                <span>  </span>
                 <span>  </span>
            </div>

            </div>
            <Header/>  
            <Navbar expand={navChange} name={name} />

            <main className={navChange ? 'maincontainer expand' : 'maincontainer' }>{children}</main>

       </>
    )
}

export default Layout
