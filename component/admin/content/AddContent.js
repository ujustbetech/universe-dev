import React, { useEffect, useState } from 'react';
import Switch from './Switch'
import Image from 'next/image';
import { auth } from '../../../firebaseConfig'
import { signInWithPopup, OAuthProvider, getAuth, signOut } from 'firebase/auth';
import { collection, push,addDoc, setDoc, doc, docs, getDocs, arrayUnion,getDoc,updateDoc,Timestamp } from "firebase/firestore";
import { getFirestore ,onSnapshot} from "firebase/firestore";
import { getStorage, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import Router from 'next/router';

const authlog = getAuth();
const storage = getStorage();
const db = getFirestore();

 // icon
 import { MdUpload } from 'react-icons/md'

// import { BsCheckLg } from "react-icons/bs";
// import { BiErrorCircle } from "react-icons/bi";



const AddContent = () => {
    const [contentType, setcontentType] = useState('')
    const [progress, setProgress] = useState(0);

    // content file upload
    const [contentFileUrls, setcontentFileUrls] = useState('')
    const [contentFileName, setcontentFileName] = useState('No file choosen')
    const [contentFileImage, setcontentFileImage] = useState('')

    // thumbnail file uplaod
    const [thumbnailUrls, setthumbnailUrls] = useState('')
    const [thumbnailfileName, setThumbnailfileName] = useState('No file choosen')
    const [thumbnailFileImage, setthumbnailFileImage] = useState('')


    const [contentName, setcontentName] = useState('')


    
    const [partnerName, setpartnerName] = useState('')
    const [contDiscription, setcontDiscription] = useState('')
    const [contentFormat, setcontentFormat] = useState('')
    const [inputFile, setinputFile] = useState('')
    const [fileName, setfileName] = useState("No file choosen");
    const [contentCategoryId,setcontentCategoryId]=useState("");
    const [contentCategoryName,setcontentCategoryName]=useState("");
    const [parternameId,setparternameId]=useState("");
    const [partnerDesig,setpartnerDesig]=useState("");
   

    const [inputTag, setInputTag] = useState('');
    const [videoUrl, setvideoUrl] = useState('');
    const [blogUrl, setblogurl] = useState('');
    const [tags, setTags] = useState([]);
    const [isKeyReleased, setIsKeyReleased] = useState(false);
    const [switchValue, setswitchValue] = useState(false);
    const [ContentData, setContentData] = useState([]);
    const [Userdata, setUserdataData] = useState([]);
    const [lpProfile, setlpProfile] = useState("");
    const [partnerNamelp, setPartnerNamelp] = useState();

    const [newLike, setNewLike] = useState(0);
    const [Views, setViews] = useState(0);
    const [totalCp, setTotalCp] = useState(0);
    const [comments, setComments] = useState([]);
    const usersCollectionRef = collection(db, "ContentData");

   

   

    // addcontent and save database 
    const HandleAddContent=async(event)=>{
        event.preventDefault();

        const isLogin = localStorage.getItem("AdminData");
        const adminDetails = JSON.parse(isLogin);
        console.log(adminDetails);
        const AdminName=adminDetails.currentuser;

       const data={
            AdminName: AdminName,
            // partnerName:partnerName,
           
            Thumbnail:thumbnailUrls,
            contentFileImages:contentFileUrls,
            contentFormat:contentFormat,
            contentType: contentType,
            contentName: contentName,
            comments: comments,
            parternameId:parternameId,
            contDiscription: contDiscription,
            contentCategoryName:contentCategoryName, 
            partnerDesig: partnerDesig,
            inputTag:tags,
            partnerNamelp:partnerNamelp,
            lpProfile:lpProfile,
            videoUrl: videoUrl,
            blogUrl: blogUrl,
            switchValue:switchValue,
            totallike:+newLike,
            totalViews:+Views,
            totalCp:+totalCp,
            AdminCreatedby:Timestamp.now()
        }

        // const cityRef = doc(usersCollectionRef);
        // await addDoc(cityRef, data);
        // const newCityRef = doc(collection(db, "ContentData"));
        // await addDoc(newCityRef, data);
     
        const docRef = await addDoc(collection(db, "ContentData"), data);
        console.log(data);
        alert("content added successfully!");

    }

    // content Type select function
    const HandleContentType=async(e)=>{
        const target=e.target;
        if(target.checked){
            setcontentType(target.value);
            console.log(e.target.value);
        }   
    }

    // contentFormat select function
    const HandleContentFormat=async(e)=>{
        const target=e.target;
        if(target.checked){
            setcontentFormat(target.value);
            console.log(e.target.value);
        }
    }

    // get contentcategory data function
    const GetContentCategory=(e)=>{
            const target=e.target.value;
            setcontentCategoryName(target);
        // setcontentCategoryId(target);
            console.log(contentCategoryName); 
        }

        const GetPartnerName= async (e)=>{
                  
            const target=e.target.value;
            console.log(target);
            getSingleDoc(target);
        
            setparternameId(target);
        
            // console.log(partnerName);
            console.log(parternameId);
        }
    

    const getSingleDoc=async(id)=>{
        const docRef = doc(db, "UsersData", id);
        const docSnap = await getDoc(docRef);


        if (docSnap.exists()) {
            console.log("Document data:", docSnap.data());
            setlpProfile(docSnap.data().lpProfileimg);
            setPartnerNamelp(docSnap.data().partnerName);
            setpartnerDesig(docSnap.data().PartnerType);          
        

          } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
          }
        //   console.log(ContentData);
        // console.log(newLike);
          
    }

//   content file upload
        const handleContentFile = (e) =>{
            console.log(e.target.files[0]);
            const file = e.target.files[0];
            const contentFileName = e.target.files[0].name;
            setcontentFileName(contentFileName);
            console.log("contentFileImages", contentFileName);

            for (let i = 0; i < e.target.files.length; i++) {
                const newImage = e.target.files[i];
                console.log(newImage);
                newImage["id"] = Math.random();
                //  setImages( [...images, newImage]);
    
                setcontentFileImage((contentFileImage) => [...contentFileImage, newImage]);
            }
        }

        const handleContentFileUpload = (e) => {
            const promises = [];
            // setImageUrls("");
            contentFileImage.map((image) => {
                // const storageRef = ref(storage, 'images/rivers.jpg');
                const storageRef = ref(storage, `/${image.name}`)
    
                // const storageRef = ref(storage,`images/${image.name}`).put(image);
                const uploadTask = uploadBytesResumable(storageRef, image);
                promises.push(uploadTask);
                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        const progress = Math.round(
                            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                        );
                        setProgress(progress);
    
                    },
                    (error) => {
                        console.log(error);
                    },
                    () => {
                        // Upload completed successfully, now we can get the download URL
                        // getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        //   console.log('File available at', downloadURL);
                        getDownloadURL(uploadTask.snapshot.ref).then((contentimgLink) => {
                            //   setUrls((prevState) => [...prevState, urls]);
                            setcontentFileUrls((contentFileUrls) => [...contentFileUrls, contentimgLink]);
                            //   setUrls( [...urls, urls]);
                        });
                    },
                );
                //   
            });
    
            Promise.all(promises)
                .then(() => alert("Content file images upload successfully"))
                .catch((err) => console.log(err));
        }

      //thumbnail
     
      const handleThumbnailFile = (e) =>{
          console.log(e.target.files[0]);
          const file = e.target.files[0];
          const thumbnailfileName = e.target.files[0].name;
          setThumbnailfileName(thumbnailfileName);
          console.log("thumnailfile", thumbnailfileName);

          for (let i = 0; i < e.target.files.length; i++) {
              const newImage = e.target.files[i];
              console.log(newImage);
              newImage["id"] = Math.random();
              //  setImages( [...images, newImage]);
  
              setthumbnailFileImage((thumbnailFileImage) => [...thumbnailFileImage, newImage]);
          }
      }

        const handleThumbnailFileUpload = (e) => {
            const promises = [];
            // setImageUrls("");
            thumbnailFileImage.map((image) => {
                // const storageRef = ref(storage, 'images/rivers.jpg');
                const storageRef = ref(storage, `/${image.name}`)
    
                // const storageRef = ref(storage,`images/${image.name}`).put(image);
                const uploadTask = uploadBytesResumable(storageRef, image);
                promises.push(uploadTask);
                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        const progress = Math.round(
                            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                        );
                        setProgress(progress);
    
                    },
                    (error) => {
                        console.log(error);
                    },
                    () => {
                        // Upload completed successfully, now we can get the download URL
                        // getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        //   console.log('File available at', downloadURL);
                        getDownloadURL(uploadTask.snapshot.ref).then((thumbnailLink) => {
                            //   setUrls((prevState) => [...prevState, urls]);
                            setthumbnailUrls((thumbnailUrls) => [...thumbnailUrls, thumbnailLink]);
                            //   setUrls( [...urls, urls]);
                        });
                    },
                );
                //   
            });
    
            Promise.all(promises)
                .then(() => alert("thumbnail file images upload successfully"))
                .catch((err) => console.log(err));
                console.log(thumbnailUrls);
        }     
      
    // console.log("image: ", images);
    console.log("thumbnailurls", thumbnailUrls);

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

    //to delete the individual tag
    const deleteTag=(index)=>{
        setTags(prevState => prevState.filter((tag,i)=>i !== index))
    }


    // useEffect 
  useEffect(() => {
    const getContent = async () => {
      const data = await getDocs(collection(db,"ContentCategory"));
      setContentData(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      console.log("content Data",data);
      console.log(ContentData);
    };

    const getUserData=async()=>{
        const data = await getDocs(collection(db,"UsersData"));
        setUserdataData(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        console.log("userdata:",data);
        console.log(Userdata);
    }
    getContent();
    getUserData();
  }, []);


    return (
        <section className='c-form  box'>
            <h1>Add Content</h1>   
       
            <ul>
                  {/* Content type */}
                  <li className='form-row'>
                    <h4>Content Type</h4>                 
                    <div className='multipleitem'>
                        <div>
                            <label htmlFor='exclusive'>
                            <input
                                id="exclusive"
                                value="Exclusive"
                                name="HandleContentType"
                                type="radio"
                                checked={contentType == 'Exclusive'}
                                onChange={HandleContentType} />
                                <div className='custom_radio'></div>
                                Exclusive   
                            </label>
                        </div>
                        <div>
                        <label htmlFor='normal'>
                            <input
                                id="normal"
                                value="Normal"
                                name="HandleContentType"
                                type="radio"
                                checked={contentType == 'Normal'}
                                onChange={HandleContentType} >  
                                 </input>
                                <div className='custom_radio' htmlFor="normal"></div>
                               
                                Normal
                              
                            </label>                  
                         </div>
                    </div>

                </li>
                    

                {/* select content Format */}
                <li className='form-row'>
                    <h4>Content Format</h4>
                    <div className='multipleitem'>
                        <div>
                          <label htmlFor='text'>
                            <input
                                id="text"
                                value="Text"
                                name="HandleContentFormat"
                                type="radio"
                                checked={contentFormat == 'Text'}
                                onChange={HandleContentFormat} />
                                <div className='custom_radio'></div>
                                Text</label>
                        </div>

                        <div>
                        <label htmlFor='audio'>
                            <input
                                id="audio"
                                value="Audio"
                                name="HandleContentFormat"
                                type="radio"
                                checked={contentFormat == 'Audio'}
                                onChange={HandleContentFormat} />
                                <div className='custom_radio'></div>
                                 Audio</label>                  
                         </div>
                  
                        <div>
                        <label htmlFor='image'>
                            <input
                                id="image"
                                value="Image"
                                name="HandleContentFormat"
                                type="radio"
                                checked={contentFormat == 'Image'}
                                onChange={HandleContentFormat} />
                                <div className='custom_radio'></div>
                               Image</label>
                        </div>

                        <div>
                        <label htmlFor='video'>
                            <input
                                id="video"
                                value="Video"
                                name="HandleContentFormat"
                                type="radio"
                                checked={contentFormat == 'Video'}
                                onChange={HandleContentFormat} />
                            <div className='custom_radio'></div>

                                 Video</label>                  
                         </div>
                  
                    </div>

                </li>

                {/* Content file */}
                <li className='form-row'>
                    <h4>Content File</h4>
                    <div className='multipleitem'>

                    <input id="file-upload" type="file" 
                     name="contentFile"
                     required
                     onChange={handleContentFile} />

                    <label htmlFor='file-upload' className='custom-file-upload'>File upload</label>
                    <span id="file-upload" className='filename'>{contentFileName}</span>
                    <span onClick={handleContentFileUpload} className='uplaod-icon'><MdUpload /></span>
                    <span> {contentFileUrls && contentFileUrls.map((contenfileUrl, i) => (
                            <img
                                key={i}
                                style={{ width: "100px" }}
                                src={contenfileUrl || "http://via.placeholder.com/300"}
                                alt="firebase-image"
                            />
                        ))}</span>
                   
                    </div>
                  
                </li>

                {/* thumbnail added */}
                <li className='form-row'>
                    <h4>Thumbnail</h4>
                    <div className='multipleitem'>

                    <input id="thumbnail-upload" type="file" 
                     name="thumbnail"
                     required
                     onChange={handleThumbnailFile} />

                    <label htmlFor='thumbnail-upload' className='custom-file-upload'>File upload </label>
                    <span id="thumbnail-upload" className='filename'>{thumbnailfileName}</span>
                    <span onClick={handleThumbnailFileUpload} className='uplaod-icon'><MdUpload /></span>
                    <span> {thumbnailUrls && thumbnailUrls.map((thumbnailurl, i) => (

                        <img
                            key={i}
                            style={{ width: "100px"}}
                            src={thumbnailurl || "http://via.placeholder.com/300"}
                            alt="firebase-image"
                        />
                        ))}</span>
                   
                    </div>
                   
                </li>

                 {/* Content Name */}
                 <li className='form-row'>
                    <h4 >Content Name</h4>
                    <div className='multipleitem'>
                        <input type="text"
                         placeholder='Content Name'
                         name="Content Name"
                         id="validationCustom01" 
                        //  value={contentName}
                         onChange={( event ) => {setcontentName(event.target.value)}}
                         required >
                        </input>                             
                    </div>
                </li>


                 {/* select Content category input */}
                 <li className='form-row'>
                    <h4>Content Category</h4>
                    <div className='multipleitem'>

                    <select  onChange={GetContentCategory}>
                    <option selected >Select category</option>
                    {
                            ContentData && ContentData.map(categorydata => {
                            // console.log(categorydata);
                            return (

                                <option value={categorydata.id} onClick={(e)=>GetContentCategory(categorydata)}>{categorydata.contentCategory}</option>

                            )
                            })
                    }
                    </select>
                   
                    </div>
                </li>


                {/* Youtube Video Url */}
                <li className='form-row'>
                    <h4 htmlFor="validationCustom02">Video Url</h4>
                    <div className='multipleitem'>
                        <input type="text"
                         placeholder='Link Video Url'
                         name="videoUrl"
                         id="validationCustom02" 
                         value={videoUrl}
                         onChange={( event ) => {setvideoUrl(event.target.value)}}
                         required >
                        </input>
                       
                        {/* <span class="valid-feedback">Looks good!</span> */}
                       
                           
                    </div>
                </li>


                {/* select Partner name from category input */}
                <li className='form-row'>
                    <h4>Select Partner name</h4>
                    <div className='multipleitem'>

                    <select onChange={GetPartnerName}>
                        <option selected>Select Partner name</option>
                        {
                            Userdata && Userdata.map(partnamedetails => {
                                // console.log("partnername",Userdata); 
                            //console.log(formUser);
                            return (

                                <option value={partnamedetails.id} >{partnamedetails.partnerName}</option>

                                )
                            })
                    }   
                    </select>
                   
                    </div>
                </li>
              
                             
              {/* hashtag */}
                <li className='form-row'>
                    <h4>hashtag</h4>
                    <div className='multipleitem hastag'>

                    {tags.map((tag,index) => <div className="tag">
                        {tag}
                        <button onClick={()=>deleteTag(index)}>x</button>
                        </div>)}

                   
                    <input   
                         type="text"
                         name="hashtag" 
                         value={inputTag}
                         placeholder="Enter a tag"
                         onKeyDown={onKeyDown}
                         onChange={onChange}
                         onKeyUp={onKeyUp}
                        //  onChange={( event ) => { setTags(event.target.value)}} 
                         required />
                     
                    </div>
                </li>

                {/* Blog Url */}
                <li className='form-row'>
                    <h4 htmlFor="validationCustom02">Blog URL</h4>
                    <div className='multipleitem'>
                        <input type="text"
                         placeholder='Link Blog Url'
                         name="blogUrl"
                         id="validationCustom02" 
                         value={blogUrl}
                         onChange={( event ) => {setblogurl(event.target.value)}}
                         required >
                        </input>
                       
                        {/* <span class="valid-feedback">Looks good!</span> */}
                       
                           
                    </div>
                </li>  

                {/* discription */}

                <li className='form-row'>
                    <h4>Content Discription</h4>
                    <div className='multipleitem'>
                        <textarea type="text" 
                        value={contDiscription}
                        name="contentDiscription"
                        placeholder='Content Discription'
                        onChange={( event ) => {setcontDiscription(event.target.value)}} 
                        required />
                    </div>
                </li>

                {/* content status */}
                <li className='form-row'>
                    <h4>Content Status</h4>
                    <div className='multipleitem'>

                        <Switch    
                        isOn={switchValue}
                        handleToggle={() => setswitchValue(!switchValue)}/>
                        
                    </div>
                </li>

                {/* submit & reset button  */}
                <li className='form-row'>  
                <div>
                    <button className='submitbtn' onClick={HandleAddContent}>Submit</button>
                
             
                    <button className='resetbtn' type='reset'>Reset</button>
                </div>    
                </li>


            </ul>

        </section>


    )
}

export default AddContent
