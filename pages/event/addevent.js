import React, {useState} from 'react'
import AddEvent from '../../component/admin/event/AddEvent'
import Layout from '../../component/Layout'
import "../../src/app/styles/main.scss";


const addevent = () => {
    return (
        <Layout>
            <AddEvent />
        </Layout>
    )
}

export default addevent
