import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HouseCard from './HouseCard';
import { useNavigate } from 'react-router-dom';

const Recommendations = ({ user }) => {
  const [listings, setListings] = useState([]);
  const [savedListings, setSavedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.uid) {
        setError('Please log in to view recommendations');
        navigate('/login');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Check if user exists in backend
        const userCheck = await axios.get('http://localhost:3000/api/users/check', {
          headers: { 'x-user-id': user.uid },
        });

        if (userCheck.data.exists === false) {
          setError('Please complete your profile to view recommendations');
          navigate('/edit-preferences');
          return;
        }

        const [recommendationsRes, favoritesRes] = await Promise.all([
          axios.get('http://localhost:3000/listings/recommendations', {
            headers: { 'x-user-id': user.uid },
          }),
          axios.get('http://localhost:3000/favorites', {
            headers: { 'x-user-id': user.uid },
          }),
        ]);
        setListings(recommendationsRes.data.listings);
        setSavedListings(favoritesRes.data.map((fav) => fav.id));
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again');
          navigate('/login');
        } else if (err.response?.status === 404) {
          setError('Please complete your profile to view recommendations');
          navigate('/edit-preferences');
        } else {
          setError(err.response?.data?.error || 'Failed to load recommendations');
        }
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, navigate]);

  const toggleSaveHouse = async (listingId) => {
    if (!user || !user.uid) {
      setError('Please log in to save listings');
      navigate('/login');
      return;
    }

    try {
      if (savedListings.includes(listingId)) {
        await axios.delete(`http://localhost:3000/favorites/${listingId}`, {
          headers: { 'x-user-id': user.uid },
        });
        setSavedListings(savedListings.filter((id) => id !== listingId));
      } else {
        await axios.post(
          'http://localhost:3000/favorites',
          { listing_id: listingId },
          { headers: { 'x-user-id': user.uid } }
        );
        setSavedListings([...savedListings, listingId]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update favorites');
      console.error('Error toggling favorite:', err);
    }
  };

  if (!user) return null;

  return (
    <div className="container px-10 py-12 z-9999 bg-[#ccd0c4]">
      <h2 className="text-3xl font-bold text-[#4E674A] mb-6">Top Recommendations for You</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && listings.length === 0 && (
        <p>No recommendations available. Try adjusting your preferences.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((house) => (
          <HouseCard
            key={house.id}
            house={house}
            user={user}
            isSaved={savedListings.includes(house.id)}
            toggleSaveHouse={toggleSaveHouse}
          />
        ))}
      </div>
    </div>
  );
};

export default Recommendations;