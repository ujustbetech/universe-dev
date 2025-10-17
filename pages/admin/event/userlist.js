import React from 'react'
import Layout from '../../../component/Layout'
import "../../../src/app/styles/main.scss";
import UserList from '../../../component/UserList';


const Userlist = () => {
    return (
        <div>
            <Layout>
                 <UserList/>
            </Layout>
           
        </div>
    )
}

export default Userlist