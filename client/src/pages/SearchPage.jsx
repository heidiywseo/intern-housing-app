import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faSliders, faMap } from '@fortawesome/free-solid-svg-icons';
import { Autocomplete, useLoadScript } from '@react-google-maps/api';
import Navbar from '../components/Navbar';
import HouseCard from '../components/HouseCard';
import FilterModal from '../components/FilterModal';

const libraries = ['places'];

export default function SearchPage({ user, setUser, savedHouses, toggleSaveHouse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState(null);
  const [filteredHouses, setFilteredHouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const addressParam = queryParams.get('address');
    if (addressParam) {
      setSearchValue(addressParam);
    }
    window.scrollTo(0, 0);
  }, [location.search]);

  useEffect(() => {
    if (showFilterModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showFilterModal]);

  const fetchListings = async (lat, lng, filters = activeFilters, pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lng,
        page: pageNum,
        page_size: 20,
      });

      if (filters) {
        if (filters.rating) params.append('min_rating', filters.rating);
        if (filters.priceRange) {
          params.append('min_price', filters.priceRange[0]);
          params.append('max_price', filters.priceRange[1]);
        }
        if (filters.distance) params.append('distance', filters.distance * 1000); // Convert km to meters
        if (filters.roomType && filters.roomType !== 'any') {
          const roomTypeMap = {
            private: 'Private room',
            shared: 'Shared room',
            entire: 'Entire home/apt',
          };
          params.append('room_type', roomTypeMap[filters.roomType]);
        }

        const amenities = Object.entries(filters.amenities || {})
          .filter(([_, isSelected]) => isSelected)
          .map(([amenity]) => amenity);
        const places = [];
        if (amenities.includes('has_nearby_gym')) places.push('gym');
        if (amenities.includes('has_nearby_grocery')) places.push('supermarket');
        if (places.length) params.append('places', JSON.stringify(places));

        const listingAmenities = amenities.filter(
          (a) => !['has_nearby_gym', 'has_nearby_grocery'].includes(a)
        );
        if (listingAmenities.length) {
          params.append('amenities', JSON.stringify(listingAmenities));
        }
      }

      const response = await fetch(`http://localhost:3000/listings/search?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch listings');
      }
      const data = await response.json();

      setFilteredHouses(
        data.listings.map((listing) => ({
          id: listing.listing_id,
          title: listing.name,
          price: listing.price_per_month,
          description: listing.description || 'No description available',
          images: [listing.picture_url || 'https://via.placeholder.com/400x200?text=No+Image'],
          bedrooms: listing.bedrooms || '--',
          bathrooms: listing.beds || '--', // Proxy; add bathrooms column if needed
          area: '--', // Add area column if needed
          roomType: listing.room_type,
          rating: listing.rating,
        }))
      );
      setTotalPages(Math.ceil(data.total / data.page_size));
      setPage(data.page);
    } catch (error) {
      console.error('Error fetching listings:', error);
      setError(error.message);
      setFilteredHouses([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceSelect = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address && place.geometry) {
        setSearchValue(place.formatted_address);
        setSelectedPlace(place);
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        navigate(`/search?address=${encodeURIComponent(place.formatted_address)}`, { replace: true });
        fetchListings(lat, lng);
      }
    }
  };

  const handleFilterClick = () => {
    setShowFilterModal(true);
  };

  const handleCloseModal = () => {
    setShowFilterModal(false);
  };

  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
    setShowFilterModal(false);
    if (selectedPlace && selectedPlace.geometry) {
      const lat = selectedPlace.geometry.location.lat();
      const lng = selectedPlace.geometry.location.lng();
      fetchListings(lat, lng, filters);
    }
  };

  const handlePageChange = (newPage) => {
    if (selectedPlace && selectedPlace.geometry) {
      const lat = selectedPlace.geometry.location.lat();
      const lng = selectedPlace.geometry.location.lng();
      fetchListings(lat, lng, activeFilters, newPage);
    }
  };

  if (loadError) {
    return <div>Error loading Google Maps API. Please check your API key and network connection.</div>;
  }

  if (!isLoaded) {
    return <div>Loading Google Maps API...</div>;
  }

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return <div>Missing Google Maps API key. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file.</div>;
  }

  return (
    <>
      <Navbar user={user} setUser={setUser} />
      <div className="min-h-screen bg-[#EDEBE4] text-[#4E674A]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {searchValue ? (
            <h1 className="text-4xl font-bold mb-6">Housing Search Results for {searchValue}</h1>
          ) : (
            <h1 className="text-4xl font-bold mb-6">Search by Address</h1>
          )}
          <div className="flex mb-8 items-center">
            <div
              className="px-5 py-3 mr-4 items-center rounded-lg bg-[#4E674A]/90 text-white font-semibold shadow-md hover:bg-[#4E674A] transition cursor-pointer"
              onClick={handleFilterClick}
            >
              Filter
              <FontAwesomeIcon icon={faSliders} className="ml-2" />
            </div>
            <div className="bg-[#f6f0e8] border-3 rounded-4xl h-14 w-full md:w-2/3 lg:w-1/2 relative">
              <div className="flex flex-row items-center justify-between w-full h-full px-4">
                <Autocomplete
                  onLoad={setAutocomplete}
                  onPlaceChanged={handlePlaceSelect}
                  options={{
                    types: ['address'],
                    componentRestrictions: { country: 'us' },
                  }}
                >
                  <input
                    placeholder="Search for an address"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="w-full p-3 text-lg font-semibold text-[#4E674A]/70 rounded-lg focus:outline-none bg-transparent"
                  />
                </Autocomplete>
                <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[#4E674A]/50 text-xl mr-4" />
              </div>
            </div>
            <FontAwesomeIcon icon={faMap} className="ml-4 text-3xl text-[#4E674A]" />
          </div>

          {activeFilters && (
            <div className="mb-4 p-3 bg-[#f6f0e8] rounded-lg">
              <h3 className="font-semibold mb-1">Active Filters:</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-[#4E674A]/20 rounded-full text-sm">
                  ${activeFilters.priceRange[0]} - ${activeFilters.priceRange[1]}
                </span>
                <span className="px-2 py-1 bg-[#4E674A]/20 rounded-full text-sm">
                  {activeFilters.roomType === 'any'
                    ? 'Any Room Type'
                    : activeFilters.roomType === 'private'
                    ? 'Private Room'
                    : activeFilters.roomType === 'shared'
                    ? 'Shared Room'
                    : 'Entire Place'}
                </span>
                <span className="px-2 py-1 bg-[#4E674A]/20 rounded-full text-sm">
                  {activeFilters.distance} km
                </span>
                <span className="px-2 py-1 bg-[#4E674A]/20 rounded-full text-sm">
                  {activeFilters.rating} Star{activeFilters.rating > 1 ? 's' : ''}
                </span>
                {Object.entries(activeFilters.amenities)
                  .filter(([_, isSelected]) => isSelected)
                  .map(([amenity]) => (
                    <span key={amenity} className="px-2 py-1 bg-[#4E674A]/20 rounded-full text-sm capitalize">
                      {amenity.replace('has_', '').replace('_', ' ')}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <p className="text-xl text-[#4E674A]">Loading results...</p>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-20">
              <p className="text-xl text-red-600">{error}</p>
            </div>
          ) : filteredHouses.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHouses.map((house) => (
                  <HouseCard
                    key={house.id}
                    house={house}
                    isSaved={savedHouses.includes(house.id)}
                    toggleSaveHouse={toggleSaveHouse}
                    user={user}
                  />
                ))}
              </div>
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 mx-2 bg-[#4E674A] text-white rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 mx-2 bg-[#4E674A] text-white rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          ) : searchValue ? (
            <div className="flex justify-center items-center py-20">
              <p className="text-xl text-[#4E674A]">No houses found for {searchValue}.</p>
            </div>
          ) : (
            <div className="flex justify-center items-center py-20">
              <p className="text-xl text-[#4E674A]">Enter an address to start searching.</p>
            </div>
          )}
        </div>
      </div>

      <FilterModal
        isOpen={showFilterModal}
        onClose={handleCloseModal}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />

      <footer className="bg-[#EDEBE4] text-[#4E674A] text-sm text-center py-4 border-t border-[#4E674A]/20">
        <p>© 2025 Woomie. All rights reserved.</p>
      </footer>
    </>
  );
}