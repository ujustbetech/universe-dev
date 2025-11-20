import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from "../firebaseConfig";
import Link from "next/link";
import HeaderNav from "../component/HeaderNav";
import Headertop from "../component/Header";  // 👈 now self-contained
import "../src/app/styles/user.scss";
import { FaMapMarkerAlt } from "react-icons/fa";
import { COLLECTIONS } from "/utility_collection";
import { IoPlanetOutline } from "react-icons/io5";

const db = getFirestore(app);

const AllEvents = () => {
  const [cosmOrbiters, setCosmOrbiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 🔎 Filter businesses
  const filteredOrbiters = cosmOrbiters.filter((co) => {
    const query = searchQuery.toLowerCase();
    return (
      co.name.toLowerCase().includes(query) ||
      co.businessName.toLowerCase().includes(query) ||
      co.businessHistory.toLowerCase().includes(query) ||
      co.city.toLowerCase().includes(query) ||
      co.locality.toLowerCase().includes(query) ||
      co.state.toLowerCase().includes(query)
    );
  });

  // 🔎 Fetch CosmOrbiters
  useEffect(() => {
    const fetchCosmOrbiters = async () => {
      try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.userDetail));
        const list = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (
            data.Category === "CosmOrbiter" &&
            ((Array.isArray(data.services) && data.services.length > 0) ||
              (Array.isArray(data.products) && data.products.length > 0))
          ) {
            list.push({
              id: doc.id,
              name: data["Name"] || "Unknown",
              businessName: data["BusinessName"] || "N/A",
              businessHistory: data["BusinessHistory"] || "N/A",
              tagline: data["TagLine"] || "",
              city: data.City || "",
              locality: data.Locality || "",
              state: data.State || "",
              logo: data["BusinessLogo"] || "",
              category: data.Category || "",
              category1: data["Category1"] || "",
              category2: data["Category2"] || "",
            });
          }
        });

        setCosmOrbiters(list);
      } catch (error) {
        console.error("Error fetching CosmOrbiters:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCosmOrbiters();
  }, []);

  return (
     <main className="pageContainer">
      {/* ✅ Header is now self-contained */}
      <Headertop />

      <section className="dashBoardMain">
        <div className="sectionHeadings">
          <h2>CosmOrbiters Businesses</h2>
        </div>

        {/* 🔎 Search */}
        <div className="search">
          <input
            type="text"
            placeholder="Search by name, business, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search__input"
          />
          <button className="search__button">
            <svg className="search__icon" aria-hidden="true" viewBox="0 0 24 24">
              <g>
                <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"></path>
              </g>
            </svg>
          </button>
        </div>

        {/* 🔎 List */}
        <div className="container eventList">
          {loading ? (
            <div className="loader">
              <span className="loader2"></span>
            </div>
          ) : filteredOrbiters.length === 0 ? (
            <p className="noDataText">No CosmOrbiters found.</p>
          ) : (
            filteredOrbiters.map((co, index) => (
              <Link
                href={`/BusinessDetails/${co.id}`}
                key={index}
                className="meetingBoxLink"
              >
                <div className="cosmoCard">
                  <div className="cosmoCard-header">
               <div className="cardLogo">
  {co.logo && /^https?:\/\//.test(co.logo) ? (
    <img src={co.logo} alt="Business Logo" />
  ) : (
    <IoPlanetOutline size={40} />
  )}
</div>

                    <div className="cosmoCard-info">
                      <p className="cosmoCard-category">
                        {co.category1} • {co.category2}
                      </p>

                      <h3 className="cosmoCard-owner">{co.businessName}</h3>
                      <div className="cosmoCard-location">
                        <div>
                          <FaMapMarkerAlt />
                        </div>
                        <p>
                          {co.locality} {co.city} {co.state}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <HeaderNav />
      </section>
    </main>
  );
};

export default AllEvents;
