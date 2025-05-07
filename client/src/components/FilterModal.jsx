import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

const FilterModal = ({ isOpen, onClose, onApply }) => {
  const [priceRange, setPriceRange] = useState([800, 2500]);
  const [roomType, setRoomType] = useState("any");
  const [dateRange, setDateRange] = useState({
    startDate: "2025-06-01",
    endDate: "2025-08-31"
  });
  const [amenities, setAmenities] = useState({
    wifi: false,
    parking: false,
    gym: false,
    laundry: true,
    ac: false,
    furnished: true
  });

  const handleAmenityChange = (amenity) => {
    setAmenities({
      ...amenities,
      [amenity]: !amenities[amenity]
    });
  };

  const handlePriceChange = (newRange) => {
    setPriceRange(newRange);
  };

  const applyFilters = () => {
    onApply({
      priceRange,
      roomType,
      dateRange,
      amenities
    });
  };

  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center p-4"
      onClick={handleBackgroundClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="bg-white p-6 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-[#4E674A]">Filter by</h2>
          <button 
            onClick={onClose}
            className="text-[#4E674A] hover:text-[#4E674A]/70"
          >
            <FontAwesomeIcon icon={faXmark} className="text-2xl" />
          </button>
        </div>
        
        <div className="px-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Price Range</h3>
            <div className="flex justify-between mb-2">
              <span className="bg-green">${priceRange[0]}</span>
              <span>${priceRange[1]}</span>
            </div>
            <input 
              type="range"
              min="500"
              max="5000"
              value={priceRange[0]}
              onChange={(e) => handlePriceChange([parseInt(e.target.value), priceRange[1]])}
              className="w-full"
            />
            <input 
              type="range"
              min="500"
              max="5000"
              value={priceRange[1]}
              onChange={(e) => handlePriceChange([priceRange[0], parseInt(e.target.value)])}
              className="w-full"
            />
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Room Type</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`p-2 border rounded ${roomType === 'any' ? 'bg-[#4E674A] text-white' : 'border-[#4E674A] text-[#4E674A]'}`}
                onClick={() => setRoomType('any')}
              >
                Any
              </button>
              <button
                className={`p-2 border rounded ${roomType === 'private' ? 'bg-[#4E674A] text-white' : 'border-[#4E674A] text-[#4E674A]'}`}
                onClick={() => setRoomType('private')}
              >
                Private Room
              </button>
              <button
                className={`p-2 border rounded ${roomType === 'shared' ? 'bg-[#4E674A] text-white' : 'border-[#4E674A] text-[#4E674A]'}`}
                onClick={() => setRoomType('shared')}
              >
                Shared Room
              </button>
              <button
                className={`p-2 border rounded ${roomType === 'entire' ? 'bg-[#4E674A] text-white' : 'border-[#4E674A] text-[#4E674A]'}`}
                onClick={() => setRoomType('entire')}
              >
                Entire Place
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Date Range</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Amenities</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox"
                  checked={amenities.wifi}
                  onChange={() => handleAmenityChange('wifi')}
                  className="form-checkbox h-5 w-5 text-[#4E674A]"
                />
                <span>WiFi</span>
              </label>
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox"
                  checked={amenities.parking}
                  onChange={() => handleAmenityChange('parking')}
                  className="form-checkbox h-5 w-5 text-[#4E674A]"
                />
                <span>Parking</span>
              </label>
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox"
                  checked={amenities.gym}
                  onChange={() => handleAmenityChange('gym')}
                  className="form-checkbox h-5 w-5 text-[#4E674A]"
                />
                <span>Gym</span>
              </label>
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox"
                  checked={amenities.laundry}
                  onChange={() => handleAmenityChange('laundry')}
                  className="form-checkbox h-5 w-5 text-[#4E674A]"
                />
                <span>Laundry</span>
              </label>
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox"
                  checked={amenities.ac}
                  onChange={() => handleAmenityChange('ac')}
                  className="form-checkbox h-5 w-5 text-[#4E674A]"
                />
                <span>A/C</span>
              </label>
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox"
                  checked={amenities.furnished}
                  onChange={() => handleAmenityChange('furnished')}
                  className="form-checkbox h-5 w-5 text-[#4E674A]"
                />
                <span>Furnished</span>
              </label>
            </div>
          </div>
          
          <button 
            onClick={applyFilters}
            className="w-full py-3 mb-2 bg-[#4E674A] text-white font-semibold rounded-lg hover:bg-[#4E674A]/90 transition"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;