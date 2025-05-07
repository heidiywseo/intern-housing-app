import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faSliders, faMap } from '@fortawesome/free-solid-svg-icons';
import Navbar from "../components/Navbar";
import HouseCard from "../components/HouseCard";
import FilterModal from "../components/FilterModal";

export default function SearchPage({ user, setUser, savedHouses, toggleSaveHouse, houses }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchValue, setSearchValue] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [activeFilters, setActiveFilters] = useState(null);
    const [filteredHouses, setFilteredHouses] = useState([]);
    const [loading, setLoading] = useState(false);

    const cities = [
        "San Francisco",
        "New York",
        "Seattle",
        "Chicago",
        "Washington D.C.",
        "Los Angeles"
    ];

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const cityParam = queryParams.get("city");
        if (cityParam) {
            setSearchValue(cityParam);
            filterHousesByCity(cityParam);
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

    const filterHousesByCity = (city) => {
        setLoading(true);

        const cityLower = city.toLowerCase();
        const filtered = houses.filter(house => {
            const locationLower = house.location.toLowerCase();
            return locationLower.includes(cityLower);
        });

        console.log("Filtered houses:", filtered);
        setFilteredHouses(filtered);
        setLoading(false);
    };

    const handleSearchFocus = () => {
        setShowDropdown(true);
    };

    const handleSearchBlur = () => {
        setTimeout(() => setShowDropdown(false), 200);
    };

    const handleCitySelect = (cityName) => {
        setSearchValue(cityName);
        setShowDropdown(false);
        navigate(`/search?city=${encodeURIComponent(cityName)}`, { replace: true });
        filterHousesByCity(cityName);
    };

    const handleFilterClick = () => {
        setShowFilterModal(true);
    };

    const handleCloseModal = () => {
        setShowFilterModal(false);
    };

    const handleApplyFilters = (filters) => {
        console.log("Filters applied:", filters);
        setActiveFilters(filters);
        setShowFilterModal(false);

        // apply filter
        if (searchValue) {
            applyFilters(filters);
        }
    };

    const applyFilters = (filters) => {
        setLoading(true);

        // city filter
        const cityLower = searchValue.toLowerCase();
        let filtered = houses.filter(house =>
            house.location.toLowerCase().includes(cityLower) ||
            (house.city && house.city.toLowerCase().includes(cityLower))
        );

        // price filter
        if (filters && filters.priceRange) {
            filtered = filtered.filter(house =>
                house.price >= filters.priceRange[0] &&
                house.price <= filters.priceRange[1]
            );
        }

        // room type filter
        if (filters && filters.roomType && filters.roomType !== 'any') {
            filtered = filtered.filter(house =>
                house.roomType === filters.roomType
            );
        }

        // amenities filter
        if (filters && filters.amenities) {
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
        setFilteredHouses(filtered);
        setLoading(false);
    };

    return (
        <>
            <Navbar user={user} setUser={setUser} />
            <div className="min-h-screen bg-[#EDEBE4] text-[#4E674A]">
                <div className="max-w-6xl mx-auto px-4 py-8">
                    {searchValue ? (
                        <h1 className="text-4xl font-bold mb-6">Housing Search Results for {searchValue}</h1>
                    ) : (
                        <h1 className="text-4xl font-bold mb-6">Select a City</h1>
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
                                <form className="w-full">
                                    <input
                                        placeholder="Search for your city"
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        onFocus={handleSearchFocus}
                                        onBlur={handleSearchBlur}
                                        className="w-full p-3 text-lg font-semibold text-[#4E674A]/70 rounded-lg focus:outline-none bg-transparent"
                                    />
                                </form>
                                <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[#4E674A]/50 text-xl mr-4" />
                            </div>
                            {showDropdown && (
                                <div className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                                    {cities.map((city, index) => (
                                        <div
                                            key={index}
                                            className="p-3 hover:bg-[#f6f0e8] cursor-pointer text-[#4E674A] font-semibold"
                                            onClick={() => handleCitySelect(city)}
                                        >
                                            {city}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <FontAwesomeIcon icon={faMap} className="ml-4 text-3xl text-[#4E674A]" />
                    </div>

                    {/* display active filter */}
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
                            <p className="text-xl text-[#4E674A]">Select a city to start searching.</p>
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
                <p>&copy; 2025 Woomie. All rights reserved.</p>
            </footer>
        </>
    );
}