import React,{useState, useEffect} from 'react';
import LoginAdmin from '../../component/admin/login/LoginAdmin'
import Router from 'next/router';

function Login() {
  const [loginStatus, setLoginStatus] = useState(true);

  useEffect(()=>{

    const Adminlogin = localStorage.getItem("AdminData");
        
    const getData=async()=>{
        console.log("admin login",Adminlogin);

        if(Adminlogin !== null){
         
            Router.push('/content/addcontent');
        }
        else{
            setLoginStatus(false);
        }
    }
    getData();

}, [])

  return (
    <div>
      {loginStatus ? <div className='loaderAdmin'> <span className="loader2"></span> </div> :null}
      
      <LoginAdmin />
  
      </div>

  )
}

export default Login