'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import styles from '../src/app/styles/Offercard.module.scss';
import ServiceProductCard from '../component/ServiceProductCard';
import ReferralModal from '../component/ReferralModal';
import { toast } from 'react-hot-toast';
import { FaFilter } from 'react-icons/fa';
import { useRouter } from "next/navigation";

import Headertop from '../component/Header';
import HeaderNav from '../component/HeaderNav';
import { COLLECTIONS } from "/utility_collection";

const db = getFirestore();

const PAGE_SIZE = 12;

const allowedCategories = [
    'IT & TECH',
    'Healthcare',
  
    'Food Industry',
 
    'Travel & Tourism',
   
];

const shuffleArray = (arr) => {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const AllServicesProducts = ({
    pageHeading = 'All Services & Products',
    hideFilters = false,
    enableInfiniteScroll = true,
    maxItems = null,
    hideHeaderFooter = false,
    extraSectionClass = '',
}) => {
    const [items, setItems] = useState([]);
    const [displayedItems, setDisplayedItems] = useState([]);
    const [nextIndex, setNextIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
const router = useRouter();

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [userCache, setUserCache] = useState({});
    const [showFilters, setShowFilters] = useState(false);

    // Fetch items from Firestore
     useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const snapshot = await getDocs(collection(db, "userdetail_dev"));
                const list = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const category1 = data['Category1']?.trim();
                    const category2 = data['Category2']?.trim();

                    if (!(allowedCategories.includes(category1) || allowedCategories.includes(category2))) return;

                    const ownerName = data['Name'] || '—';
                    const businessName = data['BusinessName'] || '—';

                   const ujbCode = data['ujbCode'] || data['UJB'] || data['ujb'] || data['ujb_code'] || doc.id;

(Array.isArray(data.services) ? data.services : []).forEach((s) =>
  list.push({
    id: doc.id,
    ujb: ujbCode,
    type: 'Service',
    name: s.name || '—',
    description: s.description || '—',
    imageURL: s.imageURL || '',
    percentage: s.percentage || '',
    keywords: s.keywords || '',
    ownerName,
    businessName,
    category: category1 || category2 || '',
  })
);

// same for products...
(Array.isArray(data.products) ? data.products : []).forEach((p) =>
  list.push({
    id: doc.id,
    ujb: ujbCode,
    type: 'Product',
    name: p.name || '—',
    description: p.description || '—',
    imageURL: p.imageURL || '',
    percentage: p.percentage || '',
    keywords: p.keywords || '',
    ownerName,
    businessName,
    category: category1 || category2 || '',
  })
);
                });

                setItems(shuffleArray(list));
            } catch (err) {
                console.error('Error fetching data:', err);
                toast.error('Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);


    // Initialize displayed items
    useEffect(() => {
        if (enableInfiniteScroll) {
            const initial = maxItems ? items.slice(0, maxItems) : items.slice(0, PAGE_SIZE);
            setDisplayedItems(initial);
            setNextIndex(initial.length);
        } else {
            setDisplayedItems(maxItems ? items.slice(0, maxItems) : items);
        }
    }, [items, enableInfiniteScroll, maxItems]);

    // Infinite scroll
    useEffect(() => {
        if (!enableInfiniteScroll) return;

        const handleScroll = () => {
            if (loadingMore || nextIndex >= items.length) return;

            const bottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
            if (bottom) {
                setLoadingMore(true);
                setTimeout(() => {
                    setDisplayedItems((prev) => [
                        ...prev,
                        ...items.slice(nextIndex, nextIndex + PAGE_SIZE),
                    ]);
                    setNextIndex((prev) => prev + PAGE_SIZE);
                    setLoadingMore(false);
                }, 600);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [items, nextIndex, loadingMore, enableInfiniteScroll]);

    const filteredItems = useMemo(() => {
        const queryLower = searchQuery.toLowerCase();
        return displayedItems.filter((item) => {
            const matchesQuery =
                item.name.toLowerCase().includes(queryLower) ||
                item.description.toLowerCase().includes(queryLower) ||
                (item.keywords && item.keywords.toLowerCase().includes(queryLower)) ||
                (item.businessName && item.businessName.toLowerCase().includes(queryLower));
            const matchesCategory =
                !selectedCategory || item.category === selectedCategory;
            return matchesQuery && matchesCategory;
        });
    }, [displayedItems, searchQuery, selectedCategory]);

    return (
        <main className={`pageContainer ${extraSectionClass}`}>
            {!hideHeaderFooter && <Headertop />}

            <section className={`dashBoardMain ${extraSectionClass}`}>
                <div className="sectionHeadings">
                    <h2>{pageHeading} ({items.length})</h2>
                    {!hideFilters && (
                        <div className="filters-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <FaFilter
                                className="filter-icon"
                                onClick={() => setShowFilters((prev) => !prev)}
                                style={{ cursor: 'pointer', fontSize: '20px', color: showFilters ? '#0070f3' : '#555' }}
                            />

                        </div>
                    )}
                </div>

                {/* Filter icon + search */}
                {!hideFilters && (
                    <>


                        {showFilters && (
                            <div className={styles.filters}>
                                <input
                                    type="text"
                                    placeholder="Search by name, description, business or keyword..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search__input"
                                />
                                {searchQuery && <span className="current-search-text">Search: "{searchQuery}"</span>}
                                <select
                                    className="categoryFilter"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    {allowedCategories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </>
                )}

                {/* Items list */}
                <div className={styles.OffersList}>
                    {loading && items.length === 0 ? (
                        <div className="loader"><span className="loader2"></span></div>
                    ) : filteredItems.length === 0 ? (
                        <p className="noDataText">No services or products found.</p>
                    ) : (
                        <>
                            {filteredItems.map((item) => (
                                <ServiceProductCard
                                    key={item.id + item.name}
                                    item={item}
                                    onRefer={() => {
                                        setSelectedItem(item);
                                        setModalOpen(true);
                                    }}
                                />
                            ))}
                            {loadingMore && enableInfiniteScroll && (
                                <div className="loader bottom-loader">
                                    <span className="loader2"></span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {!hideHeaderFooter && <HeaderNav />}
            </section>

            {modalOpen && (
                <ReferralModal
                
                    item={selectedItem}
                    onClose={() => setModalOpen(false)}
                    userCache={userCache}
                    setUserCache={setUserCache}
                />
            )}
        </main>
    );
};

export default AllServicesProducts;
