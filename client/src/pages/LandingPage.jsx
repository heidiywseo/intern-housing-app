import React, { useEffect, useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { City } from "../models/City";
import { FlyingPlane } from "../models/FlyingPlane";
import { Sky } from "../models/Sky";
import { auth } from "../firebase";
import { Range } from "react-range";
import axios from "axios";
import debounce from "lodash/debounce";
import "../index.css";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const API_URL = "http://localhost:3001"; // Hardcoded to avoid process.env errors
const PAGE_SIZE = 21;

function CameraOscillator({ radius, polarAngle, amplitude, speed, controlsRef }) {
  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    const theta = amplitude * Math.sin(t * speed);
    const x = radius * Math.sin(polarAngle) * Math.sin(theta);
    const y = radius * Math.cos(polarAngle);
    const z = radius * Math.sin(polarAngle) * Math.cos(theta);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    controlsRef.current?.update();
  });
  return null;
}

function CityButton({ city, onSelect, label, style, user }) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (!user) {
      navigate("/login");
    } else {
      onSelect(city);
    }
  };
  return (
    <motion.div
      className="cursor-pointer select-none"
      onClick={handleClick}
      style={{
        position: "relative",
        padding: "0.75rem 1.25rem",
        borderRadius: "12px",
        background: "rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1.5px solid rgba(216, 217, 218, 0.25)",
        color: "#222222",
        fontWeight: 600,
        fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        textAlign: "center",
        ...style,
      }}
      whileHover={{
        scale: 1.05,
        background: "rgba(255, 255, 255, 0.35)",
        boxShadow: "0 0 15px rgba(0,0,0,0.15)",
      }}
    >
      {label}
    </motion.div>
  );
}

export default function LandingPage({ user, setUser }) {
  const navigate = useNavigate();
  const controlsRef = useRef();
  const listingsRef = useRef();
  const [userData, setUserData] = useState(null);

  // UI state
  const [fadeOut, setFadeOut] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);

  // Filter state
  const [budgetRange, setBudgetRange] = useState([500, 4000]);
  const [ratingRange, setRatingRange] = useState([0, 5]);
  const [places, setPlaces] = useState([]);

  // 3D camera parameters
  const speed = 0.25;
  const amplitude = (15 * Math.PI) / 180;
  const radius = 11;
  const polarAngle = 1.2;

  // City mapping
  const cityMap = {
    SF: "Bay Area",
    NYC: "NYC",
    DC: "DC",
    LA: "LA",
    Seattle: "Seattle",
    Chicago: "Chicago",
    explore: "explore"
  };

  // Debounced fetch with pagination
  const debouncedFetchListings = debounce(
    async (city, budget, rating, placesArr, page = 1) => {
      try {
        setError(null);
        const url = new URL(`${API_URL}/listings/search`);
        url.searchParams.set("region", city);
        url.searchParams.set("min_rating", rating[0]);
        url.searchParams.set("max_price", budget[1]);
        url.searchParams.set("places", JSON.stringify(placesArr));
        url.searchParams.set("places_radius", "20000");
        url.searchParams.set("page", String(page));
        url.searchParams.set("page_size", String(PAGE_SIZE));

        console.log(`Fetching listings: ${url.toString()}`);
        const response = await axios.get(url.toString(), {
          headers: { "Accept": "application/json" },
          timeout: 5000,
        });
        const data = response.data;
        console.log(`Response status: ${response.status}, data length: ${data.length}`);
        setListings(data);
        setIsLastPage(data.length < PAGE_SIZE);
        listingsRef.current?.scrollIntoView({ behavior: "smooth" });
      } catch (err) {
        const errorMessage = err.response
          ? `API error: ${err.response.status} - ${err.response.data?.error || err.response.data?.details || "Unknown error"}`
          : `Network error: ${err.message}`;
        console.error(`Fetch error: ${errorMessage}`, err);
        setError(errorMessage);
        setListings([]);
        setIsLastPage(true);
      }
    },
    500
  );

  // Fetch whenever city, filters, or page change
  useEffect(() => {
    if (!selectedCity) {
      setListings([]);
      setError(null);
      return;
    }
    debouncedFetchListings(
      selectedCity,
      budgetRange,
      ratingRange,
      places,
      currentPage
    );
    return () => debouncedFetchListings.cancel();
  }, [selectedCity, budgetRange, ratingRange, places, currentPage]);

  // Reset page to 1 on filter or city change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, budgetRange, ratingRange, places]);

  // Load user data
  useEffect(() => {
    if (user) {
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) setUserData(snap.data());
      });
    }
  }, [user]);

  const handleCitySelect = (code) => {
    const realCity = cityMap[code] || code;
    setSelectedCity(realCity);
    setTimeout(
      () => listingsRef.current?.scrollIntoView({ behavior: "smooth" }),
      300
    );
  };

  const handlePlaceToggle = (place) => {
    setPlaces((prev) =>
      prev.includes(place) ? prev.filter((p) => p !== place) : [...prev, place]
    );
  };

  return (
    <motion.div
      className="min-h-screen w-full overflow-x-hidden bg-white text-gray-900"
      initial={{ opacity: 1 }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
    >
      {/* Top bar */}
      <div className="absolute top-6 right-8 z-50">
        {user ? (
          <>
            <span className="mr-4 font-semibold text-white">
              Hello, {userData?.firstName || user.email}
            </span>
            <button
              onClick={async () => {
                await auth.signOut();
                setUser(null);
              }}
              className="px-4 py-2 rounded-lg bg-white text-gray-800 font-semibold shadow-md hover:bg-gray-100 transition"
            >
              Logout
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="ml-4 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold shadow-md hover:bg-green-700 transition"
            >
              Edit Profile
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 rounded-lg bg-white text-gray-800 font-semibold shadow-md hover:bg-gray-100 transition"
          >
            Login
          </button>
        )}
      </div>

      {/* 3D City Canvas */}
      <section className="relative w-full h-screen">
        <Canvas camera={{ position: [0, 0, radius], fov: 45 }} shadows>
          <hemisphereLight skyColor="#ffffff" groundColor="#b1b1b1" intensity={0.5} />
          <directionalLight position={[10, 15, 10]} intensity={0.8} color="#fff2e5" castShadow />
          <Suspense fallback={null}>
            <Sky scale={[1, 1, 1]} position={[0, 20, 0]} />
            <ambientLight intensity={1.0} />
          </Suspense>
          <Suspense fallback={null}>
            <Environment preset="sunset" background={false} />
          </Suspense>
          <OrbitControls
            ref={controlsRef}
            enableZoom={false}
            minAzimuthAngle={-amplitude}
            maxAzimuthAngle={amplitude}
            minPolarAngle={Math.PI / 2 - 0.3}
            maxPolarAngle={Math.PI / 2 + 0.2}
          />
          <Suspense fallback={null}>
            <City scale={[1, 1, 1]} position={[0.2, 0.8, 0]} />
            <FlyingPlane />
          </Suspense>
          <ContactShadows
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, -0.2, 0]}
            opacity={0.6}
            width={10}
            height={10}
            blur={1.5}
            far={2}
          />
          <CameraOscillator
            radius={radius}
            polarAngle={polarAngle}
            amplitude={amplitude}
            speed={speed}
            controlsRef={controlsRef}
          />
        </Canvas>

        {/* City Selector Overlay */}
        <motion.div
          style={{
            position: "absolute",
            bottom: "75%",
            left: "45%",
            transform: "translateX(-50%)",
            padding: "1rem 2rem",
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(12px)",
            borderRadius: "14px",
            border: "2px solid #545E7B",
            textAlign: "center",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0 }}
        >
          <h1 className="text-3xl font-bold mb-2 text-[#545E7B]">Select Your City</h1>
          <p className="text-base text-[#131D35]">Click a box to explore each location</p>
        </motion.div>

        {/* City Buttons */}
        <div className="absolute inset-0 pointer-events-auto">
          <div style={{ position: "absolute", left: "30%", top: "15%" }}>
            <CityButton city="Seattle" onSelect={handleCitySelect} label="Seattle" user={user} />
          </div>
          <div style={{ position: "absolute", left: "10%", top: "35%" }}>
            <CityButton city="SF" onSelect={handleCitySelect} label="San Francisco" user={user} />
          </div>
          <div style={{ position: "absolute", left: "7%", top: "65%" }}>
            <CityButton city="Chicago" onSelect={handleCitySelect} label="Chicago" user={user} />
          </div>
          <div
            style={{
              position: "absolute",
              left: "40%",
              top: "83%",
              transform: "translateX(-50%)",
            }}
          >
            <CityButton city="NYC" onSelect={handleCitySelect} label="New York" user={user} />
          </div>
          <div style={{ position: "absolute", right: "22%", top: "83%" }}>
            <CityButton city="DC" onSelect={handleCitySelect} label="Washington DC" user={user} />
          </div>
          <div style={{ position: "absolute", right: "5%", bottom: "30%" }}>
            <CityButton city="LA" onSelect={handleCitySelect} label="Los Angeles" user={user} />
          </div>
          <div style={{ position: "absolute", right: "15%", top: "25%" }}>
            <CityButton city="explore" onSelect={handleCitySelect} label="More Cities" user={user} />
          </div>
        </div>
      </section>

      {/* Spacer */}
      <div className="h-40 bg-[#82a2b7]" />

      {/* Listings Section */}
      <section
        ref={listingsRef}
        className="w-full px-6 py-16 bg-gradient-to-b from-[#86A3B7] via-[#edf2f7]/80 to-[#fffff] backdrop-blur-md min-h-screen"
      >
        <h2 className="text-4xl font-extrabold text-center mb-12 text-[#2e354d]">
          Explore Housing Options in{" "}
          {selectedCity
            ? `${selectedCity}${userData?.workLocation ? `, ${userData.workLocation}` : ""}`
            : "Your City"}
        </h2>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:space-x-6 mb-12">
          {/* Budget */}
          <div className="w-full md:w-1/3 mb-6 md:mb-0">
            <label className="block mb-1">
              Budget: ${budgetRange[0]} – ${budgetRange[1]}
            </label>
            <Range
              values={budgetRange}
              step={100}
              min={500}
              max={4000}
              onChange={setBudgetRange}
              renderTrack={({ props, children }) => {
                const [min, max] = budgetRange;
                const left = ((min - 500) / 3500) * 100;
                const width = ((max - min) / 3500) * 100;
                return (
                  <div
                    {...props}
                    ref={props.ref}
                    className="h-2 w-full bg-gray-300 rounded-full relative"
                  >
                    <div
                      className="absolute top-0 h-full bg-[#6271a2] rounded-full"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                    {children}
                  </div>
                );
              }}
              renderThumb={({ props }) => (
                <div
                  {...props}
                  className="h-4 w-4 rounded-full bg-[#6271a2] shadow-md cursor-pointer"
                />
              )}
            />
          </div>

          {/* Rating */}
          <div className="w-full md:w-1/3 mb-6 md:mb-0">
            <label className="block mb-1">
              Rating: {ratingRange[0]}★ – {ratingRange[1]}★
            </label>
            <Range
              values={ratingRange}
              step={0.1}
              min={0}
              max={5}
              onChange={setRatingRange}
              renderTrack={({ props, children }) => {
                const [minR, maxR] = ratingRange;
                const left = (minR / 5) * 100;
                const width = ((maxR - minR) / 5) * 100;
                return (
                  <div
                    {...props}
                    ref={props.ref}
                    className="h-2 w-full bg-gray-300 rounded-full relative"
                  >
                    <div
                      className="absolute top-0 h-full bg-[#6271a2] rounded-full"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                    {children}
                  </div>
                );
              }}
              renderThumb={({ props }) => (
                <div
                  {...props}
                  className="h-4 w-4 rounded-full bg-[#6271a2] shadow-md cursor-pointer"
                />
              )}
            />
          </div>

          {/* Places */}
          <div className="w-full md:w-1/3">
            <label className="block mb-1">Nearby Places</label>
            <div className="flex flex-wrap gap-2">
              {["gym", "park", "supermarket", "library"].map((place) => (
                <label key={place} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={places.includes(place)}
                    onChange={() => handlePlaceToggle(place)}
                    className="mr-2"
                  />
                  {place.charAt(0).toUpperCase() + place.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && <p className="text-center text-red-600 mb-6">{error}</p>}

        {/* Listings Grid */}
        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {listings.map((l) => (
              <div
                key={l.id}
                onClick={() => navigate(`/housing/${l.id}`)}
                className="p-6 rounded-3xl bg-white/60 backdrop-blur-lg shadow-xl border border-white/30 hover:shadow-2xl cursor-pointer transition-transform hover:scale-105"
              >
                <h3 className="text-xl font-semibold text-[#2e354d] mb-1">
                  {l.name}
                </h3>
                <p className="text-gray-800">${l.price}/mo</p>
                <p className="text-yellow-500">{l.rating}★ rating</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600">
            No listings found for those filters. Try adjusting your search criteria or selecting a different city.
          </p>
        )}

        {/* Pagination Controls */}
        <div className="flex justify-center items-center mt-8 space-x-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white text-gray-800 rounded-lg shadow disabled:opacity-50"
          >
            Previous
          </button>
          <span className="font-medium">Page {currentPage}</span>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={isLastPage}
            className="px-4 py-2 bg-white text-gray-800 rounded-lg shadow disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>
    </motion.div>
  );
}
