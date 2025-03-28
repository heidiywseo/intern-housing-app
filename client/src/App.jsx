import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

import Home from "./pages/Home";
import Roommate from "./pages/Roommate";
import LoadingPage from "./pages/LoadingPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import CompleteProfileChoice from "./pages/CompleteProfileChoice";
import UserProfile from "./pages/UserProfilePage";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({
            uid: firebaseUser.uid,
            firstName: userDoc.data().firstName,
          });
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);
  

  return (
    <Router>
      {isLoading ? (
        <LoadingPage onComplete={() => setIsLoading(false)} />
      ) : (
        <Routes>
          <Route path="/" element={<LandingPage user={user} setUser={setUser} />} />
          <Route path="/roommate" element={<Roommate />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<LoginPage setUser={setUser} />} />
          <Route path="/signup" element={<SignupPage setUser={setUser} />} />
          <Route path="/completeProfileChoice" element={<CompleteProfileChoice />} />
          <Route path="/userProfile" element={<UserProfile/>} />
        </Routes>
      )}
    </Router>
  );
}
