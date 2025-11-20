import React from 'react';
import { ImProfile } from "react-icons/im";
import { FaPeopleArrows } from "react-icons/fa";
import { MdEventAvailable, MdImage, MdOutlineKeyboardArrowDown } from "react-icons/md";
import { RiListSettingsLine } from "react-icons/ri";
import { FaRegUser } from "react-icons/fa";
import { BsCake2, BsEggFill } from "react-icons/bs";
import Link from 'next/link';

import { FaRegEye } from "react-icons/fa";
import { useRouter } from "next/router";
// import { FaPeopleArrows } from "react-icons/fa";
import { GiCosmicEgg } from "react-icons/gi";
import { BsCashCoin } from "react-icons/bs";
import { GrGroup } from "react-icons/gr";
const Navbar = (props) => {
    const router = useRouter();
    
    return (
        <>
            {props.loading ? (  // Check if loading prop is true
               <div className='loader'> <span className="loader2"></span> </div>
            ) : (
                <nav className={props.expand ? 'm-navbar expand' : 'm-navbar unexpand'}>
                    <ul>
                        {/*  Event */}
                        <li>
                            <Link href="/">
                                <span className="icons"><MdEventAvailable /></span>
                                <span className="linklabel">MonthlyMeet</span>
                                <span className="submenuIcon"><MdOutlineKeyboardArrowDown /></span>
                            </Link>
                            <ul>
                                <li><Link href="/admin/event/create-event">Add Meet</Link></li>
                                <li><Link href="/admin/event/manageEvent">Manage Meet</Link></li>
                            </ul>
                        </li>
                         
                            <li>
                            <Link href="/AllBirthday">
                                <span className="icons"><BsCake2/></span>
                                <span className="linklabel">Birthdays</span>
                                <span className="submenuIcon"><BsCake2/></span>
                            </Link>
                            <ul>
                                <li><Link href="/SendBirthday">Send Wishes</Link></li>
                                <li><Link href="/AddBirthday">Add Wishes</Link></li>
                            </ul>
                        </li>
                            <li>
                            <Link href="">
                                <span className="icons"><GrGroup /></span>
                                <span className="linklabel">Conclave</span>
                                <span className="submenuIcon"><MdOutlineKeyboardArrowDown /></span>
                            </Link>
                            <ul>
                                <li><Link href="/admin/event/createconclave">Add Conclave</Link></li>
                                <li><Link href="/admin/event/manageconclave">Manage Conclave</Link></li>
                            </ul>
                        </li>
                       <li>
                            <Link href="">
                                <span className="icons"><FaPeopleArrows /></span>
                                <span className="linklabel">Referrals</span>
                                <span className="submenuIcon"><MdOutlineKeyboardArrowDown /></span>
                            </Link>
                            <ul>
                                <li><Link href="/admin/AddReferral">Add Referrals</Link></li>
                                <li><Link href="/admin/ManageReferrals">Manage Referrals</Link></li>
                            </ul>
                        </li>
                        <li>
                            <Link href="/admin/event/userlist">
                                <span className="icons"><FaRegUser /></span>
                                <span className="linklabel">Orbiters</span>
                                <span className="submenuIcon"><MdOutlineKeyboardArrowDown /></span>
                            </Link>
                            <ul>
                                <li><Link href="/admin/event/userlist">Orbiters Profiling</Link></li>
                            </ul>
                        </li>
                          <li>
                            <Link href=" ">
                                <span className="icons"><GiCosmicEgg /></span>
                                <span className="linklabel">Prospects</span>
                                <span className="submenuIcon"><MdOutlineKeyboardArrowDown /></span>
                            </Link>
                            <ul>
                                <li><Link href="/prospectadmin/event/create-prospect">Add Prospects</Link></li>
                                <li><Link href="/prospectadmin/event/manageProspect">Manage Prospects</Link></li>
                            </ul>
                        </li>
                                     <li>
                            <Link href="">
                                <span className="icons"><BsCashCoin /></span>
                                <span className="linklabel">CP</span>
                            </Link>
                
                        <ul>
                                <li><Link href="/admin/CPAdd">Add CP </Link></li>
                                <li><Link href="/admin/CPList">Manage CP</Link></li>
                            </ul>
                            </li>
                         <li>
                            <Link href="/admin/PageVisit">
                                <span className="icons"><FaRegEye /></span>
                                <span className="linklabel">User Logins</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/event/upload">
                                <span className="icons"><RiListSettingsLine /></span>
                                <span className="linklabel">Upload Excel</span>
                            </Link>
                        </li>
                    </ul>
                </nav>
            )}
        </>
    );
}

export default Navbar;

