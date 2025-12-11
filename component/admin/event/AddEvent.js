import React,{ useState } from 'react'

const AddEvent = () => {


    const [eventName, seteventName] = useState('');
    const [eventDiscription, seteventDiscription] = useState(''); 
    const [eventImg, seteventImg] = useState('');
    const [eventDate, seteventDate] = useState('');
    const [eventTime, seteventTime] = useState('');
    const [hostName, sethostName] = useState('');
    const [eventPlace, seteventPlace] = useState('');
    const [fileName, setfileName] = useState("No file choosen");


    const [contentType, setcontentType] = useState('');
    const [partnerName, setpartnerName] = useState('');
    const [contDiscription, setcontDiscription] = useState('');
    const [contentFormat, setcontentFormat] = useState('');
    const [inputFile, setinputFile] = useState('');
    const [inputTag, setInputTag] = useState('');
    const [videoUrl, setvideoUrl] = useState('');
    const [tags, setTags] = useState([]);
    const [isKeyReleased, setIsKeyReleased] = useState(false);
    const [switchValue, setswitchValue] = useState(false);
   

    
    const ContType=(event)=>{
        const {contentType}=event.target.value
       
    }
    const ContFormat=(event)=>{
        const {contentFormat}=event.target.value
      
    }

    // base 64 converter
    const getBase64 = file => {
        return new Promise(resolve => {
        let fileInfo;
        let baseURL = "";
        // Make new FileReader
        let reader = new FileReader();


        // Convert the file to base64 text
        reader.readAsDataURL(file);


        // on reader load somthing...
        reader.onload = () => {
            // Make a fileInfo Object
            console.log("Called", reader);
            baseURL = reader.result;
            console.log(baseURL);
            resolve(baseURL);
            ``


        };
        console.log(fileInfo);
        });
    };


    //file upload
        const handleFileInputChange = (e) => {
        console.log(e.target.files[0]);
    //    const selectFile=e.target.files[0];
    //     const selectedFileName= e.target.files[0];

        //let { file } = this.state;
        
        // if (e.target.files && e.target.files[0]) {
            // const img = e.target.files[0];
            // setselectedFileName(img);
        // }   
        
        const file = e.target.files[0];
        const fileName = e.target.files[0].name;
        setfileName(fileName);
        console.log(fileName);
    
        getBase64(file)
          .then(result => {
            file["base64"] = result;
            console.log("File Is", file);
            setinputFile(result)
          })
          .catch(err => {
            console.log(err);
          });
      }

    // Taginput function
    const onChange = (e) => {
        const { value } = e.target;
        setInputTag(value);
      };
    
      const onKeyDown = (e) => {
        const { key } = e;
        const trimmedInput = inputTag.trim();

      
        // after input tag use comma key to enter the new tag in input field
        if (key === 'Enter' && trimmedInput.length && !tags.includes(trimmedInput)) {
          e.preventDefault();
          setTags(prevState => [...prevState, trimmedInput]);
          setInputTag('');
          console.log(tags);
        
        }
    // when use backspace key to delete the tag
        if (key === "Backspace" && !inputTag.length && tags.length) {
            e.preventDefault();
            const tagsCopy = [...tags];
            const poppedTag = tagsCopy.pop();
        
            setTags(tagsCopy);
            setInputTag(poppedTag);
          }
          setIsKeyReleased(false);
      };

     const onKeyUp=(e)=>{
         setIsKeyReleased(true);
     }

    //  to delete the individual tag
    const deleteTag=(index)=>{
        setTags(prevState => prevState.filter((tag,i)=>i !== index))
    }


    return (
        <section className='c-form  box'>
            <h1>Add Events</h1>
            <ul>

                 {/* Event Name */}
                 <li className='form-row'>
                    <h4 htmlFor="validationCustom01">Event Name</h4>
                    <div className='multipleitem'>
                        <input type="text"
                         placeholder='Event name'
                         name="eventName"
                         id="validationCustom01" 
                         value={eventName}
                         onChange={( event ) => {seteventName(event.target.value)}}
                         required >
                        </input> 
                       
                        {/* <span class="valid-feedback">Looks good!</span> */}        
                    </div>
                </li>

                {/* Event Image */}
                <li className='form-row'>
                    <h4>Event Image</h4>
                    <div className='multipleitem'>

                    <input id="eventimg" type="file" 
                     name="file1"
                     onChange={handleFileInputChange} />

                    <label htmlFor='eventimg' className='custom-file-upload'>
                        File upload                 
                    </label>
                    <span id="eventimg">{fileName}</span>
                   
                    </div>
                </li>

                 {/* select Content category input */}
                 <li className='form-row'>
                    <h4>Event Category</h4>
                    <div className='multipleitem'>

                    <select>
                        <option selected>Select category</option>
                        <option selected>Select</option>
                    </select>
                   
                    </div>
                </li>              
               
              
                 {/* Event discription */}
                <li className='form-row'>
                    <h4>Event Discription</h4>
                    <div className='multipleitem'>
                        
                        <textarea type="text" 
                        value={eventDiscription}
                        name="eventDiscription"
                        placeholder='Event Discription' 
                        required />
                    </div>
                </li>
            
                {/* Event Place */}
                <li className='form-row'>
                    <h4 htmlFor="validationCustom02">Event Place</h4>
                    <div className='multipleitem'>
                        <input type="text"
                         placeholder=' Event Place '
                         name="eventplace"
                         id="validationCustom02" 
                         value={eventPlace}
                         onChange={( event ) => {seteventPlace(event.target.value)}}
                         required >
                        </input> 

                        {/* <span class="valid-feedback">Looks good!</span> */}        
                    </div>
                </li>

                  {/* Host Name */}
                  <li className='form-row'>
                    <h4 htmlFor="validationCustom03">Event Host Name</h4>
                    <div className='multipleitem'>
                        <input type="text"
                         placeholder=' Event Host name'
                         name="hostname"
                         id="validationCustom03" 
                         value={hostName}
                         onChange={( event ) => {sethostName(event.target.value)}}
                         required >
                        </input> 
                       
                        {/* <span class="valid-feedback">Looks good!</span> */}        
                    </div>
                </li>


                {/* event date */}
                <li className='form-row'>
                    <h4>Event Date</h4>
                    <div className='multipleitem'>
                        <input type="date"
                             htmlFor="eventdate"
                             id="eventdate"
                            name='eventdate' 
                            value={eventDate}
                            onChange={( event ) => seteventDate(event.target.value)}   
                            required />
                      </div>    
                </li>

                {/* event Time */}
                <li className='form-row'>
                    <h4>Event Time</h4>
                    <div className='multipleitem'>
                        <input type='time'
                             htmlFor="eventtime"
                             id="eventtime"
                            name='eventtime' 
                            value={eventTime}
                            onChange={( event ) => seteventTime(event.target.value)}   
                            required />
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


    )
}

export default AddEvent
