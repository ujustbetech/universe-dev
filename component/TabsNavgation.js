// components/TabNavigation.js
import React from 'react';

const TabNavigation = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div className="tab-header">
      <ul>
        {tabs.map((tab, index) => (
          <li
            key={index}
            className={activeTab === index ? 'active' : ''}
            onClick={() => setActiveTab(index)}
          >
            {tab}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TabNavigation;
