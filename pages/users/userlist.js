import React from 'react'
import ListUser from '../../component/admin/users/ListUser' 
import Layout from '../../component/Layout'
import "../../src/app/styles/main.scss";

const userlist = () => {
    return (
        <Layout>
            <ListUser/>
        </Layout>
    )
}

export default userlist
