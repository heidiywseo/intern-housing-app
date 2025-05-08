import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import axios from 'axios';
import { auth, db } from './firebase';
import Home from './pages/Home';
import Roommate from './pages/Roommate';
import LoadingPage from './pages/LoadingPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SearchPage from './pages/SearchPage';
import HouseInfo from './pages/HouseInfo';
import ProfilePage from './pages/ProfilePage';
import PreferenceForm from './pages/PreferenceForm';

// Remove dummyHouses since it's no longer needed
// const dummyHouses = [...];

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [savedHouses, setSavedHouses] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({
            uid: firebaseUser.uid,
            firstName: userDoc.data().firstName,
          });
          try {
            const favoritesRes = await axios.get('http://localhost:3000/favorites', {
              headers: { 'x-user-id': firebaseUser.uid },
            });
            setSavedHouses(favoritesRes.data.map((fav) => fav.id.toString()));
          } catch (err) {
            console.error('Error fetching saved houses:', err);
          }
        }
      } else {
        setUser(null);
        setSavedHouses([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleSaveHouse = async (houseId) => {
    if (!user) {
      window.location.href = '/login';
      return false;
    }

    try {
      if (savedHouses.includes(houseId)) {
        await axios.delete(`http://localhost:3000/favorites/${houseId}`, {
          headers: { 'x-user-id': user.uid },
        });
        setSavedHouses(savedHouses.filter((id) => id !== houseId));
      } else {
        await axios.post(
          'http://localhost:3000/favorites',
          { listing_id: houseId },
          { headers: { 'x-user-id': user.uid } }
        );
        setSavedHouses([...savedHouses, houseId]);
      }
      return true;
    } catch (error) {
      console.error('Error updating saved houses:', error);
      return false;
    }
  };

  return (
    <Router>
      {isLoading ? (
        <LoadingPage onComplete={() => setIsLoading(false)} />
      ) : (
        <Routes>
          <Route path="/" element={<LandingPage user={user} setUser={setUser} />} />
          <Route path="/roommate" element={<Roommate />} />
          <Route
            path="/search"
            element={
              <SearchPage
                user={user}
                setUser={setUser}
                savedHouses={savedHouses}
                toggleSaveHouse={toggleSaveHouse}
                // Pass real data or fetch in SearchPage
              />
            }
          />
          <Route
            path="/house/:id"
            element={
              <HouseInfo
                user={user}
                setUser={setUser}
                savedHouses={savedHouses}
                toggleSaveHouse={toggleSaveHouse}
              />
            }
          />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<LoginPage setUser={setUser} />} />
          <Route path="/signup" element={<SignupPage setUser={setUser} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/edit-preferences"
            element={
              <PreferenceForm
                userId={auth.currentUser?.uid}
                onComplete={() => (window.location = '/profile')}
              />
            }
          />
        </Routes>
      )}
    </Router>
  );
}