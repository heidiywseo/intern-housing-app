import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { Slider, Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const CustomSlider = styled(Slider)(({ theme }) => ({
  '& .MuiSlider-track': {
    backgroundColor: '#4E674A',
    border: 'none',
  },
  '& .MuiSlider-rail': {
    backgroundColor: '#d1d5db',
    opacity: 1,
  },
  '& .MuiSlider-thumb': {
    backgroundColor: '#4E674A',
    width: 20,
    height: 20,
    '&:hover, &.Mui-focusVisible': {
      boxShadow: '0px 0px 0px 8px rgba(78, 103, 74, 0.16)',
    },
  },
  '& .MuiSlider-mark': {
    backgroundColor: '#4E674A',
  },
  '& .MuiSlider-markLabel': {
    color: '#4E674A',
  },
}));

const FilterModal = ({ isOpen, onClose, onApply, initialFilters }) => {
  const [priceRange, setPriceRange] = useState(initialFilters?.priceRange || [500, 5000]);
  const [distance, setDistance] = useState(initialFilters?.distance || 10); // Default to 10km
  const [rating, setRating] = useState(initialFilters?.rating || 1); // Default to 1 star
  const [roomType, setRoomType] = useState(initialFilters?.roomType || 'any');
  const [amenities, setAmenities] = useState({
    has_wifi: initialFilters?.amenities?.has_wifi || false,
    has_kitchen: initialFilters?.amenities?.has_kitchen || false,
    has_air_conditioning: initialFilters?.amenities?.has_air_conditioning || false,
    has_parking: initialFilters?.amenities?.has_parking || false,
    has_nearby_gym: initialFilters?.amenities?.has_nearby_gym || false,
    has_nearby_grocery: initialFilters?.amenities?.has_nearby_grocery || false,
  });

  const handleAmenityChange = (amenity) => {
    setAmenities({
      ...amenities,
      [amenity]: !amenities[amenity],
    });
  };

  const handlePriceChange = (event, newValue) => {
    setPriceRange(newValue);
  };

  const handleRatingChange = (event, newValue) => {
    setRating(newValue);
  };

  const applyFilters = () => {
    onApply({
      priceRange,
      distance,
      rating,
      roomType,
      amenities,
    });
    onClose();
  };

  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/50"
      onClick={handleBackgroundClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="bg-white p-6 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-2xl font-bold text-[#4E674A]">Filter by</h2>
          <button
            onClick={onClose}
            className="text-[#4E674A] hover:text-[#4E674A]/70"
          >
            <FontAwesomeIcon icon={faXmark} className="text-2xl" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Price Range */}
          <div className="mb-6">
            <Typography variant="h6" className="text-lg font-semibold mb-3 text-[#4E674A]">
              Price Range
            </Typography>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography className="text-[#4E674A]">${priceRange[0]}</Typography>
              <Typography className="text-[#4E674A]">${priceRange[1]}</Typography>
            </Box>
            <CustomSlider
              value={priceRange}
              onChange={handlePriceChange}
              valueLabelDisplay="auto"
              min={500}
              max={5000}
              step={100}
              disableSwap
            />
          </div>

          {/* Distance to Workplace */}
          <div className="mb-6">
            <Typography variant="h6" className="text-lg font-semibold mb-3 text-[#4E674A]">
              Distance to Workplace
            </Typography>
            <select
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value))}
              className="w-full p-2 border rounded text-[#4E674A] focus:outline-none focus:ring-2 focus:ring-[#4E674A]"
            >
              <option value={0.5}>0.5 km</option>
              <option value={1}>1 km</option>
              <option value={2}>2 km</option>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
            </select>
          </div>

          {/* Rating */}
          <div className="mb-6">
            <Typography variant="h6" className="text-lg font-semibold mb-3 text-[#4E674A]">
              Minimum Rating
            </Typography>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography className="text-[#4E674A]">
                {rating} Star{rating > 1 ? 's' : ''}
              </Typography>
            </Box>
            <CustomSlider
              value={rating}
              onChange={handleRatingChange}
              valueLabelDisplay="auto"
              min={1}
              max={5}
              step={1}
            />
          </div>

          {/* Room Type */}
          <div className="mb-6">
            <Typography variant="h6" className="text-lg font-semibold mb-3 text-[#4E674A]">
              Room Type
            </Typography>
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

          {/* Amenities */}
          <div className="mb-6">
            <Typography variant="h6" className="text-lg font-semibold mb-3 text-[#4E674A]">
              Amenities
            </Typography>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={amenities.has_wifi}
                  onChange={() => handleAmenityChange('has_wifi')}
                  className="form-checkbox h-5 w-5 text-[#4E674A]"
                />
                <span>WiFi</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={amenities.has_kitchen}
                  onChange={() => handleAmenityChange('has_kitchen')}
                  className="form-checkbox h-5 w-5 text-[#4E674A]"
                />
                <span>Kitchen</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={amenities.has_air_conditioning}
                  onChange={() => handleAmenityChange('has_air_conditioning')}
                  className="form-checkbox h-5 w-5 text-[#4E674A]"
                />
                <span>Air Conditioning</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={amenities.has_parking}
                  onChange={() => handleAmenityChange('has_parking')}
                  className="form-checkbox h-5 w-5 text-[#4E674A]"
                />
                <span>Parking</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={amenities.has_nearby_gym}
                  onChange={() => handleAmenityChange('has_nearby_gym')}
                  className="form-checkbox h-5 w-5 text-[#4E674A]"
                />
                <span>Gym within 200m</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={amenities.has_nearby_grocery}
                  onChange={() => handleAmenityChange('has_nearby_grocery')}
                  className="form-checkbox h-5 w-5 text-[#4E674A]"
                />
                <span>Grocery within 200m</span>
              </label>
            </div>
          </div>

          {/* Apply Button */}
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