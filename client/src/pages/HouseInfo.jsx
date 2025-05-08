import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faBookmark, faBed, faBath, faWifi, faFan, faUtensils, faCar, faTv, faTemperatureHigh, faStar, faUsers } from '@fortawesome/free-solid-svg-icons';
import Navbar from "../components/Navbar";
import axios from 'axios';

const HouseInfo = ({ user, setUser, savedHouses, toggleSaveHouse }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [house, setHouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [potentialRoomies, setPotentialRoomies] = useState([]);
  const [address, setAddress] = useState('Unknown');
  const [optInStatus, setOptInStatus] = useState(null);

  useEffect(() => {
    const fetchHouseData = async () => {
      try {
        // Fetch house data
        const response = await axios.get(`http://localhost:3000/listings/${id}/insights`, {
          headers: user ? { 'x-user-id': user.uid } : {},
        });

        const { listing, amenities, reviews, crime_stats, nearby_places } = response.data;

        // Fetch address using Google Maps Geocoding API
        let formattedAddress = 'Unknown';
        try {
          const geocodeResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
              latlng: `${listing.location.latitude},${listing.location.longitude}`,
              key: 'YOUR_GOOGLE_MAPS_API_KEY', // Replace with your API key
            },
          });
          if (geocodeResponse.data.status === 'OK' && geocodeResponse.data.results.length > 0) {
            formattedAddress = geocodeResponse.data.results[0].formatted_address;
          }
        } catch (error) {
          console.error('Error fetching address:', error);
        }
        setAddress(formattedAddress);

        // Map backend data
        const houseData = {
          id: listing.id.toString(),
          title: listing.name || 'No Title Available',
          location: formattedAddress,
          price: listing.price_per_month || 0,
          description: listing.description || 'No description available.',
          bedrooms: listing.bedrooms || 0,
          bathrooms: listing.beds || 0,
          area: listing.accommodates ? listing.accommodates * 100 : 0,
          amenities: [
            amenities.has_wifi && 'WiFi',
            amenities.has_kitchen && 'Kitchen',
            amenities.has_air_conditioning && 'Air Conditioning',
            amenities.has_parking && 'Parking',
            amenities.has_washer && 'Washer',
            amenities.has_dryer && 'Dryer',
            amenities.has_heating && 'Heating',
            amenities.has_tv && 'TV',
          ].filter(Boolean),
          images: [listing.picture_url || 'https://via.placeholder.com/600x400?text=No+Image'],
          reviews: {
            number_of_reviews: reviews?.number_of_reviews ?? 0,
            overall_rating: Number(reviews?.review_scores_rating ?? 0),
            cleanliness: Number(reviews?.components?.cleanliness ?? 0),
            location: Number(reviews?.components?.location ?? 0),
            value: Number(reviews?.components?.value ?? 0),
          },
          crime_stats: {
            total_crimes: crime_stats?.total_crimes ?? 0,
            common_crimes: crime_stats?.common_crimes ?? [],
          },
          nearby_places: nearby_places || [],
        };

        setHouse(houseData);

        // Fetch roommates
        const roommatesResponse = await axios.get(`http://localhost:3000/roommate/listings/${id}/roommates`, {
          headers: user ? { 'x-user-id': user.uid } : {},
        });
        console.log('Roommates response:', roommatesResponse.data);
        setPotentialRoomies(roommatesResponse.data.roommates);

        // Check opt-in status if user is authenticated
        if (user) {
          try {
            const optInCheck = await axios.get(`http://localhost:3000/roommate/listings/${id}/opt-in/status`, {
              headers: { 'x-user-id': user.uid },
            });
            console.log('Opt-in status:', optInCheck.data);
            setOptInStatus(optInCheck.data.isOptedIn ? 'opted-in' : null);
          } catch (error) {
            if (error.response?.status !== 404) {
              console.error('Error checking opt-in status:', error);
            }
            setOptInStatus(null);
          }
        }
      } catch (error) {
        console.error('Error fetching house data:', error);
        setHouse(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHouseData();
  }, [id, user]);

  const handleOptIn = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      // Check user preferences
      const prefResponse = await axios.get('http://localhost:3000/roommate/preferences/check', {
        headers: { 'x-user-id': user.uid },
      });

      if (!prefResponse.data.isComplete) {
        const incomplete = prefResponse.data.incompleteFields || [];
        alert(`Please complete your profile preferences: ${incomplete.join(', ') || 'Some fields are missing.'}`);
        navigate('/edit-preferences');
        return;
      }

      // Opt in for roommate
      const optInResponse = await axios.post(
        `http://localhost:3000/roommate/listings/${id}/opt-in`,
        {},
        { headers: { 'x-user-id': user.uid } }
      );

      setOptInStatus('opted-in');
      alert('Successfully opted in for roommate matching!');

      // Refresh roommates
      const roommatesResponse = await axios.get(`http://localhost:3000/roommate/listings/${id}/roommates`, {
        headers: { 'x-user-id': user.uid },
      });
      console.log('Roommates after opt-in:', roommatesResponse.data);
      setPotentialRoomies(roommatesResponse.data.roommates);
    } catch (error) {
      console.error('Error opting in:', error);
      if (error.response?.status === 400 && error.response.data.error === 'User already opted in for this listing') {
        setOptInStatus('opted-in');
        alert('You have already opted in for this listing.');
      } else {
        alert('Failed to opt in. Please try again.');
      }
    }
  };

  const handleOptOut = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      // Opt out of roommate matching
      const optOutResponse = await axios.delete(`http://localhost:3000/roommate/listings/${id}/opt-in`, {
        headers: { 'x-user-id': user.uid },
      });

      setOptInStatus(null);
      alert('Successfully opted out of roommate matching!');

      // Refresh roommates
      const roommatesResponse = await axios.get(`http://localhost:3000/roommate/listings/${id}/roommates`, {
        headers: { 'x-user-id': user.uid },
      });
      console.log('Roommates after opt-out:', roommatesResponse.data);
      setPotentialRoomies(roommatesResponse.data.roommates);
    } catch (error) {
      console.error('Error opting out:', error);
      if (error.response?.status === 400 && error.response.data.error === 'User is not opted in for this listing') {
        setOptInStatus(null);
        alert('You are not opted in for this listing.');
      } else {
        alert('Failed to opt out. Please try again.');
      }
    }
  };

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
              {/* Gallery */}
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
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleSaveHouse(id)}
                    className={`p-2 rounded-full ${isSaved ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <FontAwesomeIcon icon={faBookmark} size="lg" />
                  </button>
                  <button
                    onClick={optInStatus === 'opted-in' ? handleOptOut : handleOptIn}
                    className={`py-2 px-4 rounded-lg flex items-center gap-2 ${
                      optInStatus === 'opted-in'
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-[#4E674A] text-white hover:bg-[#4E674A]/90'
                    }`}
                  >
                    <FontAwesomeIcon icon={faUsers} />
                    {optInStatus === 'opted-in' ? 'Opt Out' : 'Opt In for Roommate'}
                  </button>
                </div>
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
                      case 'air conditioning': icon = faFan; break;
                      case 'kitchen': icon = faUtensils; break;
                      case 'parking': icon = faCar; break;
                      case 'tv': icon = faTv; break;
                      case 'heating': icon = faTemperatureHigh; break;
                      case 'washer':
                      case 'dryer': icon = faUtensils; break;
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
                    <p className="text-gray-500">Area</p>
                    <p>{house.area} sq ft</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-[#4E674A]">Reviews</h2>
                <div className="bg-white rounded-lg p-4 shadow-md">
                  {house.reviews.number_of_reviews > 0 ? (
                    <>
                      <p className="flex items-center gap-2 mb-2">
                        <FontAwesomeIcon icon={faStar} className="text-yellow-500" />
                        <span>Overall Rating: {house.reviews.overall_rating.toFixed(1)} / 5 ({house.reviews.number_of_reviews} reviews)</span>
                      </p>
                      <p className="mb-1">Cleanliness: {house.reviews.cleanliness.toFixed(1)} / 5</p>
                      <p className="mb-1">Location: {house.reviews.location.toFixed(1)} / 5</p>
                      <p>Value: {house.reviews.value.toFixed(1)} / 5</p>
                    </>
                  ) : (
                    <p className="text-gray-500">No reviews available for this listing.</p>
                  )}
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-[#4E674A]">Safety Information</h2>
                <div className="bg-white rounded-lg p-4 shadow-md">
                  <p className="mb-2">Total Crimes (within 2km, Dec 2024 - Jan 2026): {house.crime_stats.total_crimes}</p>
                  <p>Most Common Crime Types: {house.crime_stats.common_crimes.join(', ') || 'None'}</p>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-[#4E674A]">Nearby Places</h2>
                <div className="bg-white rounded-lg p-4 shadow-md">
                  {house.nearby_places.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {house.nearby_places.map((place, index) => (
                        <li key={index} className="mb-2">
                          {place.name || 'Unnamed'} ({place.type}, {place.source})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No nearby places found within 200m.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:w-1/3 bg-white rounded-lg p-6 shadow-md h-fit">
              <h2 className="text-xl font-semibold mb-4 text-[#4E674A]">Potential Roommates</h2>
              {potentialRoomies.length > 0 ? (
                <div className="space-y-4">
                  {potentialRoomies.map(roomie => (
                    <div key={roomie.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg">
                      <img
                        src={'https://via.placeholder.com/50'} // Placeholder until real profile pics
                        alt={roomie.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">
                          {roomie.name}
                          {user && roomie.id === user.uid && (
                            <span className="ml-2 text-xs bg-[#4E674A] text-white px-2 py-1 rounded-full">Me</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{roomie.email || 'Contact through app'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No potential roommates yet. Opt in to connect!</p>
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