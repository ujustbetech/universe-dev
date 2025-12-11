import Header from "./header/Header";
import Navbar from "./navbar/Navbar";
import Image from 'next/image'
import ujustbelogo from '../../public/images/ujblogo.png'
import { useState } from "react";

// components/layout.js
export default function Layout({ children }) {
  const [navChange, setnavChange] = useState(false);
  const [name, setName] = useState("false");
  
 

  return (
    <>
      <div className={navChange ? 'logoContainer expand' : 'logoContainer' }>
        <div className="logo"><Image src={ujustbelogo} width={65} height={65} alt="search_bar" ></Image></div>
          <div className="ham-menu-btn" onClick={() => setnavChange(!navChange)}>
          <span> </span>
          <span>  </span>
          <span>  </span>
        </div>
      </div>
      <Header/>   
     <Navbar expand={navChange} name={name} />
    
      <main className={navChange ? 'maincontainer expand' : 'maincontainer' } >{children}</main>
      {/* <Footer /> */}
    </>
  )
}