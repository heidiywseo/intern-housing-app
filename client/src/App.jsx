import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Home from "./pages/Home";
import Roommate from "./pages/Roommate";
import LoadingPage from "./pages/LoadingPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import SearchPage from "./pages/SearchPage";
import HouseInfo from "./pages/HouseInfo";
import ProfilePage from './pages/ProfilePage';
import PreferenceForm from './pages/PreferenceForm';


const dummyHouses = [
  {
    id: '1',
    title: 'Modern Apartment in Downtown',
    location: 'San Francisco, CA',
    price: 1850,
    description: 'A bright and spacious apartment in the heart of the city, perfect for professionals.',
    bedrooms: 2,
    bathrooms: 1.5,
    area: 1200,
    amenities: ['WiFi', 'Kitchen', 'AC', 'Parking'],
    availableFrom: 'June 1, 2025',
    leaseLength: '12 months',
    images: [
      'https://placehold.co/600x400/edebe4/4e674a?text=House+1+Image+1',
      'https://placehold.co/600x400/edebe4/4e674a?text=House+1+Image+2',
      'https://placehold.co/600x400/edebe4/4e674a?text=House+1+Image+3'
    ]
  },
  {
    id: '2',
    title: 'Cozy Studio near Tech Hub',
    location: 'Seattle, WA',
    price: 1650,
    description: 'Stylish studio apartment within walking distance to major tech companies.',
    bedrooms: 1,
    bathrooms: 1,
    area: 800,
    amenities: ['WiFi', 'Kitchen', 'Laundry'],
    availableFrom: 'May 15, 2025',
    leaseLength: '6-12 months',
    images: [
      'https://placehold.co/600x400/edebe4/4e674a?text=House+2+Image+1',
      'https://placehold.co/600x400/edebe4/4e674a?text=House+2+Image+2'
    ]
  },
  {
    id: '3',
    title: 'Suburban House with Yard',
    location: 'Chicago, IL',
    price: 2100,
    description: 'Spacious family home with yard in quiet neighborhood, ideal for remote workers.',
    bedrooms: 3,
    bathrooms: 2,
    area: 1800,
    amenities: ['WiFi', 'Kitchen', 'AC', 'Parking', 'Yard'],
    availableFrom: 'June 15, 2025',
    leaseLength: '12+ months',
    images: [
      'https://placehold.co/600x400/edebe4/4e674a?text=House+3+Image+1',
      'https://placehold.co/600x400/edebe4/4e674a?text=House+3+Image+2',
      'https://placehold.co/600x400/edebe4/4e674a?text=House+3+Image+3'
    ]
  }
];

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [savedHouses, setSavedHouses] = useState([]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({
            uid: firebaseUser.uid,
            firstName: userDoc.data().firstName,
          });
          
          // Load saved houses if they exist in the user document
          if (userDoc.data().savedHouses) {
            setSavedHouses(userDoc.data().savedHouses);
          }
        }
      } else {
        setUser(null);
        setSavedHouses([]);
      }
    });
    return () => unsubscribe();
  }, []);
  
  // Function to toggle saved houses (to be passed to components)
  const toggleSaveHouse = async (houseId) => {
    if (!user) {
      // Redirect to login if not logged in
      return false;
    }
    
    const newSavedHouses = savedHouses.includes(houseId)
      ? savedHouses.filter(id => id !== houseId)
      : [...savedHouses, houseId];
    
    setSavedHouses(newSavedHouses);
    
    // Update in Firestore
    try {
      await updateDoc(doc(db, "users", user.uid), {
        savedHouses: newSavedHouses
      });
      return true;
    } catch (error) {
      console.error("Error updating saved houses:", error);
      return false;
    }
  };
  const getHouseById = (id) => dummyHouses.find(house => house.id === id) || null;

  return (
    <Router>
      {isLoading ? (
        <LoadingPage onComplete={() => setIsLoading(false)} />
      ) : (
        <Routes>
          <Route path="/" element={<LandingPage user={user} setUser={setUser} />} />
          <Route path="/roommate" element={<Roommate />} />
          <Route path="/search" element={
            <SearchPage 
              user={user} 
              setUser={setUser} 
              savedHouses={savedHouses}
              toggleSaveHouse={toggleSaveHouse}
              houses={dummyHouses}
            />
          } />
          <Route path="/house/:id" element={
            <HouseInfo
              user={user}
              setUser={setUser}
              savedHouses={savedHouses}
              toggleSaveHouse={toggleSaveHouse}
              getHouseById={getHouseById}
            />
          } />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<LoginPage setUser={setUser} />} />
          <Route path="/signup" element={<SignupPage setUser={setUser} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
             path="/edit-preferences"
            element={<PreferenceForm userId={auth.currentUser?.uid} onComplete={() => window.location = "/profile"} />}
          />
       
      
        </Routes>
      )}
    </Router>
  );
}