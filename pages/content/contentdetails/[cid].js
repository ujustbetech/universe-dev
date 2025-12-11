import React,{useState,useEffect} from 'react'

const  Contentdetails=( {contentdetail} )=> {
    const contentdetailId = contentdetail.cid;

    const [contentData, setcontentData] = useState([]);




    
    useEffect(() => {
      
       // get all data from firebase
       const getAllDocument = async () => {
           onSnapshot(collection(db, "ContentData"), (snapshot) => {
               console.log("Content details", snapshot);
               setcontentData(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
              
           })
           
       }
       getAllDocument();

       }, [])

  return (
    <div>content details</div>
  )
}

export default Contentdetails


export async function getServerSideProps({ query }) {
    console.log("query", query);
    return {
      props: {
  
        contentdetail: query
      }
    }
  }