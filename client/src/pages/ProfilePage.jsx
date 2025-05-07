import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { auth, db } from "../firebase";
import HouseCard from "../components/HouseCard";

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      // Fetch user profile data
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) setUserData(snap.data());
      });

      // Fetch favorite listings
      const fetchFavorites = async () => {
        setLoadingFavorites(true);
        try {
          const response = await fetch('http://localhost:3000/favorites', {
            headers: { 'X-User-ID': user.uid },
          });
          if (!response.ok) throw new Error('Failed to fetch favorites');
          const data = await response.json();
          setFavorites(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoadingFavorites(false);
        }
      };
      fetchFavorites();
    } else {
      navigate("/login");
    }
  }, [user, navigate]);

  const toggleSaveHouse = async (listingId) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const isSaved = favorites.some((house) => house.id === listingId);
      const method = isSaved ? 'DELETE' : 'POST';
      const url = isSaved
        ? `http://localhost:3000/favorites/${listingId}`
        : 'http://localhost:3000/favorites';
      const body = isSaved ? {} : { listing_id: listingId };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.uid,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to update favorite');

      if (isSaved) {
        setFavorites((prev) => prev.filter((house) => house.id !== listingId));
      } else {
        // Fetch updated favorites
        const listingResponse = await fetch('http://localhost:3000/favorites', {
          headers: { 'X-User-ID': user.uid },
        });
        if (!listingResponse.ok) throw new Error('Failed to fetch favorites');
        const updatedFavorites = await listingResponse.json();
        setFavorites(updatedFavorites);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setError(error.message);
    }
  };

  if (!userData) return <p className="text-white text-center">Loading...</p>;

  return (
    <div className="min-h-screen py-10 bg-[#4E674A]/90">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          className="bg-white p-10 rounded-xl shadow-xl w-full max-w-lg mx-auto mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">
            Your Profile
          </h2>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700">Name</h3>
                <p className="text-gray-600">
                  {userData.firstName} {userData.lastName}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Email</h3>
                <p className="text-gray-600">{userData.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700">Budget</h3>
                <p className="text-gray-600">
                  ${userData.minBudget || "N/A"} - ${userData.maxBudget || "N/A"}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Work ZIP</h3>
                <p className="text-gray-600">{userData.workLocation || "N/A"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700">Roommate Preference</h3>
                <p className="text-gray-600">{userData.roommateStatus || "N/A"}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Sleep / Wake</h3>
                <p className="text-gray-600">
                  {userData.sleepTime || "N/A"} / {userData.wakeTime || "N/A"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700">Cleanliness</h3>
                <p className="text-gray-600">{userData.cleanliness || "N/A"}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Noise Tolerance</h3>
                <p className="text-gray-600">{userData.noiseTolerance || "N/A"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700">Guests</h3>
                <p className="text-gray-600">{userData.guests || "N/A"}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Smoking / Drinking</h3>
                <p className="text-gray-600">
                  {userData.smoking || "N/A"} / {userData.drinking || "N/A"}
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Pets</h3>
              <p className="text-gray-600">{userData.pets || "N/A"}</p>
            </div>
          </div>
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => navigate("/edit-preferences")}
              className="px-6 py-3 bg-[#4E674A] text-white rounded-lg hover:bg-[#4E674A]/70 transition"
            >
              Edit Preferences
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-[#4E674A] text-white rounded-lg hover:bg-[#4E674A]/70 transition"
            >
              Back to Home
            </button>
          </div>
        </motion.div>

        <div className="bg-white p-10 rounded-xl shadow-xl w-full">
          <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">
            Your Favorite Listings
          </h2>
          {loadingFavorites ? (
            <p className="text-center text-gray-600">Loading favorites...</p>
          ) : error ? (
            <p className="text-center text-red-600">{error}</p>
          ) : favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((house) => (
                <HouseCard
                  key={house.id}
                  house={house}
                  isSaved={true}
                  toggleSaveHouse={toggleSaveHouse}
                  user={user}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600">No favorite listings yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}