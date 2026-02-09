'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import styles from '../src/app/styles/Offercard.module.scss';
import ServiceProductCard from '../component/ServiceProductCard';
import ReferralModal from '../component/ReferralModal';
import { toast } from 'react-hot-toast';
import { FaFilter } from 'react-icons/fa';
import Headertop from '../component/Header';
import HeaderNav from '../component/HeaderNav';

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
  const [showFilters, setShowFilters] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [userCache, setUserCache] = useState({});

  const [recommendedItems, setRecommendedItems] = useState([]);

  // 🔥 KEYCATEGORY BASED RECOMMENDATION
  const findRecommendations = (currentItem) => {
    if (!currentItem?.keyCategory) {
      setRecommendedItems([]);
      return;
    }

    const currentCategory = currentItem.keyCategory.trim().toLowerCase();

    const matches = items.filter((item) => {
      return (
        item.id !== currentItem.id &&
        item.keyCategory &&
        item.keyCategory.trim().toLowerCase() === currentCategory
      );
    });

    setRecommendedItems(matches);
  };

  // 🔥 FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'usersdetail'));
        const list = [];

        snapshot.forEach((doc) => {
          const data = doc.data();

          const category1 = data?.Category1?.trim();
          const category2 = data?.Category2?.trim();

          if (
            !allowedCategories.includes(category1) &&
            !allowedCategories.includes(category2)
          )
            return;

          const ownerName = data?.Name || '—';
          const businessName = data?.BusinessName || '—';

          const ujbCode =
            data?.ujbCode ||
            data?.UJB ||
            data?.ujb ||
            data?.ujb_code ||
            doc.id;

          // ⭐ IMPORTANT: keyCategory from ROOT
          const keyCategory = data?.keyCategory || '';

          const servicesArr = Array.isArray(data.services)
            ? data.services
            : [];

          const productsArr = Array.isArray(data.products)
            ? data.products
            : [];

          // ⭐ SERVICES
          servicesArr.forEach((s, index) =>
            list.push({
              id: `${doc.id}_service_${index}`,
              mainId: doc.id,
              ujb: ujbCode,
              type: 'Service',
              name: s?.name || '—',
              description: s?.description || '—',
              imageURL: s?.imageURL || '',
              percentage: s?.agreedValue?.single?.value || '',
              keyCategory: keyCategory,
              ownerName,
              businessName,
              category: category1 || category2 || '',
            })
          );

          // ⭐ PRODUCTS
          productsArr.forEach((p, index) =>
            list.push({
              id: `${doc.id}_product_${index}`,
              mainId: doc.id,
              ujb: ujbCode,
              type: 'Product',
              name: p?.name || '—',
              description: p?.description || '—',
              imageURL: p?.imageURL || '',
              percentage: p?.agreedValue?.single?.value || '',
              keyCategory: keyCategory,
              ownerName,
              businessName,
              category: category1 || category2 || '',
            })
          );
        });

        setItems(shuffleArray(list));
      } catch (err) {
        console.error(err);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 🔥 INITIAL LOAD
  useEffect(() => {
    if (enableInfiniteScroll) {
      const initial = maxItems
        ? items.slice(0, maxItems)
        : items.slice(0, PAGE_SIZE);

      setDisplayedItems(initial);
      setNextIndex(initial.length);
    } else {
      setDisplayedItems(maxItems ? items.slice(0, maxItems) : items);
    }
  }, [items, enableInfiniteScroll, maxItems]);

  // 🔥 INFINITE SCROLL
  useEffect(() => {
    if (!enableInfiniteScroll) return;

    const handleScroll = () => {
      if (loadingMore || nextIndex >= items.length) return;

      const bottom =
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200;

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

  // 🔥 SEARCH + FILTER
  const filteredItems = useMemo(() => {
    const queryLower = searchQuery.toLowerCase();

    return displayedItems.filter((item) => {
      const matchesQuery =
        item.name.toLowerCase().includes(queryLower) ||
        item.description.toLowerCase().includes(queryLower) ||
        item.businessName?.toLowerCase().includes(queryLower);

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
          <h2>
            {pageHeading} ({items.length})
          </h2>

          {!hideFilters && (
            <FaFilter
              onClick={() => setShowFilters((p) => !p)}
              style={{ cursor: 'pointer' }}
            />
          )}
        </div>

        {!hideFilters && showFilters && (
          <div className={styles.filters}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {allowedCategories.map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {/* ⭐ ITEMS */}
        <div className={styles.OffersList}>
          {loading ? (
            <div className="loader" />
          ) : filteredItems.length === 0 ? (
            <p>No data found</p>
          ) : (
            filteredItems.map((item) => (
              <ServiceProductCard
                key={item.id}
                item={item}
                onView={findRecommendations}
                onRefer={() => {
                  setSelectedItem(item);
                  setModalOpen(true);
                }}
              />
            ))
          )}
        </div>

        {loadingMore && <div className="loader bottom-loader" />}

        {!hideHeaderFooter && <HeaderNav />}
      </section>

      {modalOpen && (
        <ReferralModal
          item={selectedItem}
          recommendedItems={recommendedItems}
          onClose={() => setModalOpen(false)}
          userCache={userCache}
          setUserCache={setUserCache}
        />
      )}
    </main>
  );
};

export default AllServicesProducts;
