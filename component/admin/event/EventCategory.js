import React,{useState} from 'react'

const ContentCategory = () => {
const [eventCategory,seteventCategory]=useState("");
const [listCategory,setlistcategory]=useState("");



    return (
    <>
        <section className='c-form  box'>
        <h1> Add Event Category</h1>
        <ul>

             {/* Add Event Category */}
             <li className='form-row'>
                <h4>Event Category</h4>
                <div className='multipleitem'>
                    <input type="text"
                     placeholder='Enter Event Category eg. Healing Session, '
                     name="eventCategory"
                       value={eventCategory}
                     onChange={( event ) => {seteventCategory(event.target.value)}}
                     required >
                    </input>     
                </div>
            </li>
                   
        {/* submit and reset btn */}
            <li className='form-row'>

             {/* submit & reset button  */}
            <div>
                <button className='submitbtn'>Submit</button>
            
         
                <button className='resetbtn'>Reset</button>
            </div>    
            </li>


        </ul>
        </section>


        {/* event listing table  */}
        <section className='box userlisting'>
        <h2>
                Event Category List
        </h2>
        <table>
            <thead>
                <tr>
            
                <th>Created By</th>
                <th>Created Time</th>
                <th>category Name</th>
                <th>Action </th>
                <th>Created By</th>
                <th>Created Time</th>
                <th>category Name</th>
                <th>Action </th>
            
                </tr>
        </thead>
            <tbody>
                <tr>
                
                    <td>Soni</td>
                    <td>12:00 am</td>
                    <td>djbsj</td>
                    <td>edit delete</td>
                    <td>Soni</td>
                    <td>12:00 am</td>
                    <td>djbsj</td>
                    <td>edit delete</td>
                    
                
                </tr>
                      
        </tbody>
        </table>
        </section>

    </>
    )
}

export default ContentCategory
