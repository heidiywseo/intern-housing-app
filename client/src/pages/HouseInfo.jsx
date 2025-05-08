import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faBookmark, faBed, faBath, faWifi, faFan, faUtensils, faCar } from '@fortawesome/free-solid-svg-icons';
import Navbar from "../components/Navbar";
import axios from 'axios'; // Import axios for API calls

// Dummy roommates data (unchanged)
const dummyRoommates = [
  {
    id: '101',
    name: 'Alex Johnson',
    profilePic: 'https://randomuser.me/api/portraits/women/44.jpg',
    phone: '(555) 123-4567'
  },
  {
    id: '102',
    name: 'Jamie Smith',
    profilePic: 'https://randomuser.me/api/portraits/men/32.jpg',
    phone: '(555) 987-6543'
  }
];

const HouseInfo = ({ user, setUser, savedHouses, toggleSaveHouse }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [house, setHouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [potentialRoomies, setPotentialRoomies] = useState([]);
  
  useEffect(() => {
    const fetchHouseData = async () => {
      try {
        // Fetch house data from the backend
        const response = await axios.get(`http://localhost:3000/listings/${id}/insights`, {
          headers: user ? { 'x-user-id': user.uid } : {},
        });
        
        const listing = response.data.listing;
        const amenities = response.data.amenities;

        // Map backend data to the format expected by the frontend
        const houseData = {
          id: listing.id.toString(), // Convert to string to match savedHouses
          title: listing.name || 'No Title Available',
          location: `${listing.latitude}, ${listing.longitude}`, // Adjust based on your needs
          price: listing.price_per_month,
          description: listing.description || 'No description available.',
          bedrooms: listing.bedrooms || 0,
          bathrooms: listing.beds || 0, // Using beds as bathrooms (adjust if you have actual bathroom data)
          area: listing.accommodates ? `${listing.accommodates * 100} sq ft` : 'Unknown', // Placeholder
          amenities: [
            amenities.has_wifi && 'WiFi',
            amenities.has_kitchen && 'Kitchen',
            amenities.has_air_conditioning && 'AC',
            amenities.has_parking && 'Parking',
            amenities.has_washer && 'Washer',
            amenities.has_dryer && 'Dryer',
            amenities.has_heating && 'Heating',
            amenities.has_tv && 'TV',
          ].filter(Boolean), // Filter out falsy values
          availableFrom: 'Unknown', // Add if available in backend
          leaseLength: 'Unknown', // Add if available in backend
          images: [listing.picture_url || 'https://via.placeholder.com/600x400?text=No+Image'],
        };

        setHouse(houseData);

        // Temp dummy roommates logic
        const shouldHaveRoommates = Math.random() > 0.5;
        if (shouldHaveRoommates) {
          setPotentialRoomies(dummyRoommates);
        } else {
          setPotentialRoomies([]);
        }
      } catch (error) {
        console.error('Error fetching house data:', error);
        setHouse(null); // Trigger "House not found" on error
      } finally {
        setLoading(false);
      }
    };

    fetchHouseData();
  }, [id, user]);
  
  const isSaved = savedHouses.includes(id);
  
  const nextImage = () => {
    if (house && house.images) {
      setCurrentImageIndex((currentImageIndex + 1) % house.images.length);
    }
  };
  
  const prevImage = () => {
    if (house && house.images) {
      setCurrentImageIndex((currentImageIndex - 1 + house.images.length) % house.images.length);
    }
  };
  
  if (loading) {
    return (
      <>
        <Navbar user={user} setUser={setUser} />
        <div className="flex items-center justify-center min-h-screen bg-[#EDEBE4]">
          <div className="text-[#4E674A] text-xl">Loading...</div>
        </div>
      </>
    );
  }
  
  if (!house) {
    return (
      <>
        <Navbar user={user} setUser={setUser} />
        <div className="flex items-center justify-center min-h-screen bg-[#EDEBE4]">
          <div className="text-[#4E674A] text-xl">House not found</div>
        </div>
      </>
    );
  }
  
  // Rest of the component remains unchanged
  return (
    <div className="">
      <Navbar user={user} setUser={setUser} />
      <div className="min-h-screen bg-[#EDEBE4] py-8 px-10">
        <div className="max-w-7xl mx-auto px-4">
          <button 
            onClick={() => navigate(-1)}
            className="mb-4 text-[#4E674A] hover:underline flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faArrowLeft} /> Back to results
          </button>
          
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              {/* gallery */}
              <div className="relative rounded-lg overflow-hidden h-96 bg-gray-200">
                {house.images && house.images.length > 0 ? (
                  <img 
                    src={house.images[currentImageIndex]} 
                    alt={`${house.title} view ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    No image available
                  </div>
                )}
                
                {/* arrows */}
                {house.images && house.images.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white p-2 rounded-full"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} className="text-gray-800" />
                    </button>
                    <button 
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white p-2 rounded-full"
                    >
                      <FontAwesomeIcon icon={faArrowRight} className="text-gray-800" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <div className="flex gap-2">
                        {house.images.map((_, index) => (
                          <div 
                            key={index}
                            className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-6 mb-4">
                <h1 className="text-3xl font-bold text-[#4E674A]">{house.title}</h1>
                <button 
                  onClick={() => toggleSaveHouse(id)}
                  className={`p-2 rounded-full ${isSaved ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <FontAwesomeIcon icon={faBookmark} size="lg" />
                </button>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <p className="text-lg text-gray-600">{house.location}</p>
                <p className="text-xl font-semibold text-[#4E674A]">${house.price}/month</p>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-[#4E674A]">Description</h2>
                <p className="text-gray-700 leading-relaxed">{house.description}</p>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-[#4E674A]">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {house.amenities && house.amenities.map((amenity, index) => {
                    let icon;
                    switch (amenity.toLowerCase()) {
                      case 'wifi': icon = faWifi; break;
                      case 'ac': icon = faFan; break;
                      case 'kitchen': icon = faUtensils; break;
                      case 'parking': icon = faCar; break;
                      default: icon = null;
                    }
                    
                    return (
                      <div key={index} className="flex items-center gap-3">
                        {icon && <FontAwesomeIcon icon={icon} className="text-[#4E674A]" />}
                        <span>{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-[#4E674A]">Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-gray-500">Bedrooms</p>
                    <p className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faBed} className="text-[#4E674A]" />
                      {house.bedrooms}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Bathrooms</p>
                    <p className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faBath} className="text-[#4E674A]" />
                      {house.bathrooms}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Available from</p>
                    <p>{house.availableFrom}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Lease length</p>
                    <p>{house.leaseLength}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Area</p>
                    <p>{house.area} sq ft</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-1/3 bg-white rounded-lg p-6 shadow-md h-fit">
              <h2 className="text-xl font-semibold mb-4 text-[#4E674A]">Potential Roomies</h2>
              
              {potentialRoomies.length > 0 ? (
                <div className="space-y-4">
                  {potentialRoomies.map(roomie => (
                    <div key={roomie.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg">
                      <img 
                        src={roomie.profilePic || 'https://via.placeholder.com/50'} 
                        alt={roomie.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">{roomie.name}</p>
                        <p className="text-sm text-gray-500">{roomie.phone || 'Contact through app'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No potential roommates yet. Be the first to bookmark this place!</p>
              )}
              
              <div className="mt-8 p-4 bg-[#EDEBE4]/50 rounded-lg">
                <h3 className="font-semibold mb-2 text-[#4E674A]">Contact Landlord</h3>
                <p className="text-sm text-gray-600 mb-4">Interested in this property? Reach out directly:</p>
                <button className="w-full py-2 bg-[#4E674A] text-white rounded-lg hover:bg-[#4E674A]/90">
                  Message Landlord
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-[#EDEBE4] text-[#4E674A] text-sm text-center py-4 border-t border-[#4E674A]/20">
        <p>© 2025 Woomie. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HouseInfo;