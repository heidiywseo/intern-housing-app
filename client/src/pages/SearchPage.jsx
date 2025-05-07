import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faSliders, faMap } from '@fortawesome/free-solid-svg-icons';
import { Autocomplete, useLoadScript } from '@react-google-maps/api';
import Navbar from "../components/Navbar";
import HouseCard from "../components/HouseCard";
import FilterModal from "../components/FilterModal";

// Define libraries as a static constant to prevent reload warning
const libraries = ['places'];

export default function SearchPage({ user, setUser, savedHouses, toggleSaveHouse, houses }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState(null);
  const [filteredHouses, setFilteredHouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState(null);

  // Load Google Maps script
  // Ensure VITE_GOOGLE_MAPS_API_KEY is set in .env (e.g., VITE_GOOGLE_MAPS_API_KEY=your-api-key)
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const addressParam = queryParams.get("address");
    if (addressParam) {
      setSearchValue(addressParam);
      filterHousesByAddress(addressParam);
    } else {
      setFilteredHouses([]);
    }
    window.scrollTo(0, 0);
  }, [location.search, houses]);

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

  const filterHousesByAddress = (address, place = null) => {
    setLoading(true);

    let filtered = houses;
    if (place) {
      // Extract address components (e.g., city, ZIP code) from Google Places result
      const addressComponents = place.address_components || [];
      const city = addressComponents.find(comp => comp.types.includes('locality'))?.long_name;
      const postalCode = addressComponents.find(comp => comp.types.includes('postal_code'))?.long_name;
      const state = addressComponents.find(comp => comp.types.includes('administrative_area_level_1'))?.short_name;

      filtered = houses.filter(house => {
        const locationLower = house.location?.toLowerCase() || '';
        const houseCity = house.city?.toLowerCase() || '';
        const houseZip = house.zip_code || '';
        const houseState = house.state?.toLowerCase() || '';

        return (
          (city && (locationLower.includes(city.toLowerCase()) || houseCity.includes(city.toLowerCase()))) ||
          (postalCode && houseZip === postalCode) ||
          (state && houseState.includes(state.toLowerCase())) ||
          locationLower.includes(address.toLowerCase())
        );
      });
    } else {
      // Fallback to string-based search if no place object
      const addressLower = address.toLowerCase();
      filtered = houses.filter(house => {
        const locationLower = house.location?.toLowerCase() || '';
        const houseCity = house.city?.toLowerCase() || '';
        return locationLower.includes(addressLower) || houseCity.includes(addressLower);
      });
    }

    // Apply active filters if present
    if (activeFilters) {
      filtered = applyFilters(filtered, activeFilters);
    }

    setFilteredHouses(filtered);
    setLoading(false);
  };

  const applyFilters = (housesToFilter, filters) => {
    let filtered = [...housesToFilter];

    // Price filter
    if (filters.priceRange) {
      filtered = filtered.filter(house =>
        house.price >= filters.priceRange[0] &&
        house.price <= filters.priceRange[1]
      );
    }

    // Room type filter
    if (filters.roomType && filters.roomType !== 'any') {
      filtered = filtered.filter(house =>
        house.roomType === filters.roomType
      );
    }

    // Amenities filter
    if (filters.amenities) {
      const requiredAmenities = Object.entries(filters.amenities)
        .filter(([_, isSelected]) => isSelected)
        .map(([amenity]) => amenity.toLowerCase());

      if (requiredAmenities.length > 0) {
        filtered = filtered.filter(house => {
          if (!house.amenities) return false;
          return requiredAmenities.every(requiredAmenity =>
            house.amenities.some(houseAmenity =>
              houseAmenity.toLowerCase() === requiredAmenity
            )
          );
        });
      }
    }

    return filtered;
  };

  const handlePlaceSelect = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address) {
        setSearchValue(place.formatted_address);
        setSelectedPlace(place);
        navigate(`/search?address=${encodeURIComponent(place.formatted_address)}`, { replace: true });
        filterHousesByAddress(place.formatted_address, place);
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

    if (searchValue) {
      filterHousesByAddress(searchValue, selectedPlace);
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
                  {activeFilters.roomType === 'any' ? 'Any Room Type' :
                    activeFilters.roomType === 'private' ? 'Private Room' :
                      activeFilters.roomType === 'shared' ? 'Shared Room' : 'Entire Place'}
                </span>
                {Object.entries(activeFilters.amenities)
                  .filter(([_, isSelected]) => isSelected)
                  .map(([amenity]) => (
                    <span key={amenity} className="px-2 py-1 bg-[#4E674A]/20 rounded-full text-sm capitalize">
                      {amenity}
                    </span>
                  ))
                }
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <p className="text-xl text-[#4E674A]">Loading results...</p>
            </div>
          ) : filteredHouses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHouses.map(house => (
                <HouseCard
                  key={house.id}
                  house={house}
                  isSaved={savedHouses.includes(house.id)}
                  toggleSaveHouse={toggleSaveHouse}
                  user={user}
                />
              ))}
            </div>
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