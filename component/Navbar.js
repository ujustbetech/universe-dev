import React from 'react';
import Link from 'next/link';
import { useRouter } from "next/router";

import { AiOutlineHome } from "react-icons/ai";
import { MdEventAvailable, MdOutlineContentPaste, MdOutlineKeyboardArrowDown } from "react-icons/md";
import { RiListSettingsLine } from "react-icons/ri";
import { FaRegUser, FaPeopleArrows, FaRegEye } from "react-icons/fa";
import { BsCake2, BsCashCoin } from "react-icons/bs";
import { GrGroup } from "react-icons/gr";
import { GiCosmicEgg } from "react-icons/gi";

const Navbar = (props) => {
  const router = useRouter();

  return (
    <>
      {props.loading ? (
        <div className="loader">
          <span className="loader2"></span>
        </div>
      ) : (
        <nav className={props.expand ? 'm-navbar expand' : 'm-navbar unexpand'}>
          <ul>

            {/* Dashboard */}
            {/* <li>
              <Link href="/admin/dashboard" className="nav-link">
                <span className="icons"><AiOutlineHome /></span>
                <span className="linklabel">Dashboard</span>
              </Link>
            </li> */}

            {/* Monthly Meet */}
            <li>
              <span className="nav-link">
                <span className="icons"><MdEventAvailable /></span>
                <span className="linklabel">Monthly Meet</span>
                <MdOutlineKeyboardArrowDown className="submenuIcon" />
              </span>
              <ul>
                <li><Link href="/admin/event/create-event">Add Meet</Link></li>
                <li><Link href="/admin/event/manageEvent">Manage Meet</Link></li>
              </ul>
            </li>
{/* Event */}
<li>
  <span className="nav-link">
    <span className="icons"><MdEventAvailable /></span>
    <span className="linklabel">Event</span>
    <MdOutlineKeyboardArrowDown className="submenuIcon" />
  </span>

  <ul>
    <li>
      <Link href="/event/addevent">Add Event</Link>
    </li>
    <li>
      <Link href="/event/eventcategory">Event Listing</Link>
    </li>
  </ul>
</li>

            {/* Content */}
            <li>
              <span className="nav-link">
                <span className="icons"><MdOutlineContentPaste /></span>
                <span className="linklabel">Content</span>
                <MdOutlineKeyboardArrowDown className="submenuIcon" />
              </span>
              <ul>
                <li><Link href="/content/addcontent">Add Content</Link></li>
                <li><Link href="/content/contentlist">Content Listing</Link></li>
              </ul>
            </li>

            {/* Users */}
            <li>
              <span className="nav-link">
                <span className="icons"><FaRegUser /></span>
                <span className="linklabel">Users</span>
                <MdOutlineKeyboardArrowDown className="submenuIcon" />
              </span>
              <ul>
                <li><Link href="/users/adduser">Add User</Link></li>
                <li><Link href="/users/userlist">User Listing</Link></li>
                <li><Link href="/users/businesscategory">Business Category</Link></li>
              </ul>
            </li>

            {/* Birthdays */}
            <li>
              <span className="nav-link">
                <span className="icons"><BsCake2 /></span>
                <span className="linklabel">Birthdays</span>
                <MdOutlineKeyboardArrowDown className="submenuIcon" />
              </span>
              <ul>
                <li><Link href="/SendBirthday">Send Wishes</Link></li>
                <li><Link href="/AddBirthday">Add Wishes</Link></li>
              </ul>
            </li>

            {/* Conclave */}
            <li>
              <span className="nav-link">
                <span className="icons"><GrGroup /></span>
                <span className="linklabel">Conclave</span>
                <MdOutlineKeyboardArrowDown className="submenuIcon" />
              </span>
              <ul>
                <li><Link href="/admin/event/createconclave">Add Conclave</Link></li>
                <li><Link href="/admin/event/manageconclave">Manage Conclave</Link></li>
              </ul>
            </li>

            {/* Referrals */}
            <li>
              <span className="nav-link">
                <span className="icons"><FaPeopleArrows /></span>
                <span className="linklabel">Referrals</span>
                <MdOutlineKeyboardArrowDown className="submenuIcon" />
              </span>
              <ul>
                <li><Link href="/admin/AddReferral">Add Referrals</Link></li>
                <li><Link href="/admin/ManageReferrals">Manage Referrals</Link></li>
              </ul>
            </li>

            {/* Prospects */}
            <li>
              <span className="nav-link">
                <span className="icons"><GiCosmicEgg /></span>
                <span className="linklabel">Prospects</span>
                <MdOutlineKeyboardArrowDown className="submenuIcon" />
              </span>
              <ul>
                <li><Link href="/prospectadmin/event/create-prospect">Add Prospects</Link></li>
                <li><Link href="/prospectadmin/event/manageProspect">Manage Prospects</Link></li>
              </ul>
            </li>

            {/* CP */}
            <li>
              <span className="nav-link">
                <span className="icons"><BsCashCoin /></span>
                <span className="linklabel">CP</span>
                <MdOutlineKeyboardArrowDown className="submenuIcon" />
              </span>
              <ul>
                <li><Link href="/admin/CPAdd">Add CP</Link></li>
                <li><Link href="/admin/CPList">Manage CP</Link></li>
              </ul>
            </li>

            {/* User Logins */}
            <li>
              <Link href="/admin/PageVisit" className="nav-link">
                <span className="icons"><FaRegEye /></span>
                <span className="linklabel">User Logins</span>
              </Link>
            </li>

            {/* Upload Excel */}
            <li>
              <Link href="/admin/event/upload" className="nav-link">
                <span className="icons"><RiListSettingsLine /></span>
                <span className="linklabel">Upload Excel</span>
              </Link>
            </li>

          </ul>
        </nav>
      )}
    </>
  );
};

export default Navbar;
