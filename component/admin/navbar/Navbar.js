import React from 'react';
import { AiOutlineHome } from "react-icons/ai";
import { MdEventAvailable, MdOutlineContentPaste, MdOutlineKeyboardArrowDown } from "react-icons/md";
import { RiListSettingsLine, RiSurveyLine } from "react-icons/ri";
import { FaRegUser } from "react-icons/fa";
import Link from 'next/link';

const Navbar = (props) => {
  return (
    <nav className={props.expand ? 'm-navbar expand' : 'm-navbar unexpand'}>
      <ul>
        {/* Dashboard */}
        {/* <li>
          <Link href="/admin/dashboard" className="nav-link">
            <span className="icons"><AiOutlineHome /></span>
            <span className="linklabel">Dashboard</span>
          </Link>
        </li> */}

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
              <Link href="/event/eventlist">Event Listing</Link>
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
            <li>
              <Link href="/content/addcontent">Add Content</Link>
            </li>
            <li>
              <Link href="/content/contentlist">Content Listing</Link>
            </li>
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
            <li>
              <Link href="/users/adduser">Add User</Link>
            </li>
            <li>
              <Link href="/users/userlist">User Listing</Link>
            </li>
            <li>
              <Link href="/users/businesscategory">Business Category</Link>
            </li>
          </ul>
        </li>

        {/* Enquiry */}
        {/* <li>
          <Link href="/admin/enquiry" className="nav-link">
            <span className="icons"><RiSurveyLine /></span>
            <span className="linklabel">Enquiry</span>
          </Link>
        </li>

    
        <li>
          <Link href="/admin/setting" className="nav-link">
            <span className="icons"><RiListSettingsLine /></span>
            <span className="linklabel">Setting</span>
          </Link>
        </li> */}
      </ul>
    </nav>
  );
};

export default Navbar;
