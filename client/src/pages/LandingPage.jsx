import React, { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { City } from "../models/City";
import { FlyingPlane } from "../models/FlyingPlane"; 
import { Sky }  from "../models/Sky";
import { auth } from "../firebase";
import { Range } from "react-range";

import {
  leftuparrow,
  leftdownarrow,
  rightuparrow,
  rightdownarrow,
} from "../assets/icons";
import "../index.css";

// Camera side-to-side motion
function CameraOscillator({ radius, polarAngle, amplitude, speed, controlsRef }) {
  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    const theta = amplitude * Math.sin(t * speed);

    // Convert spherical coordinates for gentle left-right
    const x = radius * Math.sin(polarAngle) * Math.sin(theta);
    const y = radius * Math.cos(polarAngle);
    const z = radius * Math.sin(polarAngle) * Math.cos(theta);

    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);

    if (controlsRef.current) controlsRef.current.update();
  });
  return null;
}

function CityButton({ city, onSelect, label, style, user }) {
  const navigate = useNavigate();
  const handleClick = () => {
    console.log("User is:", user);
    if (!user) {
      console.log("Redirecting to login...");
      navigate("/login");
    } else {
      console.log(`Navigating to /search?city=${city}`);
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
        fontWeight: "600",
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

const promptLogin = () => {
  navigate("/login");
};





export default function LandingPage({ user, setUser }) {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);
  const controlsRef = useRef();
  const [budgetRange, setBudgetRange] = useState([500, 4000]);
  const [commuteRange, setCommuteRange] = useState([0, 120]);
  const [ratingRange, setRatingRange] = useState([0, 5]);

  // Camera + oscillation parameters
  const speed = 0.25;          
  const amplitude = 15 * (Math.PI / 180); 
  const radius = 11;           
  const polarAngle = 1.2;      
  const [selectedCity, setSelectedCity] = useState(null);
  const listingsRef = useRef(null);

  const handleCitySelect = (cityName) => {
    setSelectedCity(cityName);
    setTimeout(() => {
      listingsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  return (
    
    <motion.div
      className="min-h-screen w-full overflow-x-hidden bg-white text-gray-900"
      initial={{ opacity: 1 }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
    >
      <div className="absolute top-6 right-8 z-50 pointer-events-auto">
  {user ? (
    <>
      <span className="mr-4 font-semibold text-white">
        Hello, {user.firstName}
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
    </>
  ) : (
    <button
      onClick={() => navigate("/login")}
      className="px-4 py-2 rounded-lg bg-white text-gray-800 font-semibold shadow-md hover:bg-gray-100 transition"
    >
      Login
    </button>
  )}
</div> <section className="relative w-full h-screen">
      <Canvas camera={{ position: [0, 0, radius], fov: 45 }} shadows>
        {/* Soft lighting */}
        <hemisphereLight skyColor="#ffffff" groundColor="#b1b1b1" intensity={0.5} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={0.8}
          color="#fff2e5"
          castShadow
        />
        <Suspense fallback={null}>
        <Sky scale={[1, 1, 1]} position={[0, 20, 0]} />
        <ambientLight intensity={1.0} />
        </Suspense>
        <Suspense fallback={null}>
    <Environment preset="sunset" background={false} />
  </Suspense>

        {/* OrbitControls */}
        <OrbitControls
          ref={controlsRef}
          enableZoom={false}
          minAzimuthAngle={-amplitude}
          maxAzimuthAngle={amplitude}
          maxPolarAngle={Math.PI / 2 + 0.2}
          minPolarAngle={Math.PI / 2 - 0.3}
        />

        <Suspense fallback={null}>
          <City scale={[1, 1, 1]} position={[0.2, 0.8, 0]} />
        </Suspense>

        <Suspense fallback={null}>
            <FlyingPlane />
        </Suspense>

        {/* Contact shadow to ground the city */}
        <ContactShadows
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, -0.2, 0]}
          opacity={0.6}
          width={10}
          height={10}
          blur={1.5}
          far={2}
        />

        {/* camera oscillation */}
        <CameraOscillator
          radius={radius}
          polarAngle={polarAngle}
          amplitude={amplitude}
          speed={speed}
          controlsRef={controlsRef}
        />
      </Canvas>
      

      {/* Select City Box */}
      <motion.div
        style={{
          position: "absolute",
          bottom: "75%",
          left: "45%",
          transform: "translateX(-50%)",
          padding: "1rem 2rem",
          background: "rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "14px",
          border: "2px solid #545E7B",
          textAlign: "center",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0 }}
      >
        <h1
            className="text-3xl font-bold mb-2"
            style={{
              color: "#545E7B",
              opacity: 0.8,
              textShadow: "0 0 8px rgba(255,255,255,0.4)",
            }}
          >
            Select Your City
          </h1>

        <p className="text-base"
        style={{
          color: "#131D35",
          opacity: 1,
          textShadow: "0 0 8px rgba(255,255,255,0.4)",
        }}
        >
          Click a box to explore each location
        </p>
      </motion.div>

      <div className="absolute inset-0 pointer-events-auto">


    {/* Seattle  */}
    <div style={{ position: "absolute", left: "30%", top: "15%" }}>
    <CityButton
      city="Seattle"
      onSelect={handleCitySelect}
      label="Seattle"
      user={user}
    />
  </div>

  {/* SF  */}
  <div style={{ position: "absolute", left: "10%", top: "35%" }}>
    <CityButton
      city="SF"
      onSelect={handleCitySelect}
      label="San Francisco"
      user={user}
    />
  </div>

      {/* Chicago  */}
      <div style={{ position: "absolute", left: "7%", top: "65%" }}>
    <CityButton
      city="Chicago"
      onSelect={handleCitySelect}
      label="Chicago"
      user={user}
    />
  </div>

    {/* NYC Arrow */}
    <div style={{ position: "absolute", left: "40%", top: "83%", transform: "translateX(-50%)" }}>
    <CityButton
      city="NYC"
      onSelect={handleCitySelect}
      label="New York"
      user={user}
    />
  </div>

    {/* Washington D.C. (right lower-mid) */}
    <div style={{ position: "absolute", right: "22%", top: "83%" }}>
    <CityButton
      city="DC"
      onSelect={handleCitySelect}
      label="Washington D.C."
      user={user}
    />
  </div>

  {/* LA Arrow */}
  <div style={{ position: "absolute", right: "5%", bottom: "30%" }}>
    <CityButton
      city="LA"
      onSelect={handleCitySelect}
      label="Los Angeles"
      user={user}
    />
  </div>


  {/* "More Cities"  */}
  <div style={{ position: "absolute", right: "15%", top: "25%" }}>
    <CityButton
      city="explore"
      onSelect={handleCitySelect}
      label="More Cities"
      user={user}
    />
  </div>
</div>
</section>

<div className="h-40 bg-[#82a2b7]"></div>

<section
  ref={listingsRef}
  className="w-full px-6 py-16 bg-gradient-to-b from-[#86A3B7] via-[#edf2f7]/80 to-[#fffff] backdrop-blur-md min-h-screen transition-all duration-700"
>

  <h2 className="text-4xl font-extrabold text-center mb-12 text-[#2e354d] tracking-tight drop-shadow-md">
    Explore Housing Options in {selectedCity || "Your City"}
  </h2>

  <div className="flex flex-col text-sm font-medium text-[#2e354d] w-60">
  <label className="mb-1">
    Budget <span className="font-semibold">${budgetRange[0]} - ${budgetRange[1]}</span>
  </label>
  <Range
    values={budgetRange}
    step={100}
    min={500}
    max={4000}
    onChange={(values) => setBudgetRange(values)}
    renderTrack={({ props, children }) => {
      const [min, max] = budgetRange;
      const percentageLeft = ((min - 500) / (4000 - 500)) * 100;
      const percentageWidth = ((max - min) / (4000 - 500)) * 100;
      return (
        <div
          {...props}
          className="h-2 w-full bg-gray-300 rounded-full relative"
          ref={props.ref}
        >
          <div
            className="absolute top-0 h-full bg-[#6271a2] rounded-full"
            style={{
              left: `${percentageLeft}%`,
              width: `${percentageWidth}%`,
            }}
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
  <div className="flex justify-between text-xs text-gray-600 mt-1">
    <span>$500</span>
    <span>$4000</span>
  </div>


  <div className="flex flex-col text-sm font-medium text-[#2e354d] w-60">
  <label className="mb-1">
    Commute <span className="font-semibold">{commuteRange[0]} - {commuteRange[1]} mins</span>
  </label>
  <Range
    values={commuteRange}
    step={5}
    min={0}
    max={120}
    onChange={(values) => setCommuteRange(values)}
    renderTrack={({ props, children }) => {
      const [minC, maxC] = commuteRange;
      const minCommute = 0;
      const maxCommute = 120;
      const left = ((minC - minCommute) / (maxCommute - minCommute)) * 100;
      const width = ((maxC - minC) / (maxCommute - minCommute)) * 100;
    
      return (
        <div
          {...props}
          className="h-2 w-full bg-gray-300 rounded-full relative"
          ref={props.ref}
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
  <div className="flex justify-between text-xs text-gray-600 mt-1">
    <span>5 min</span>
    <span>90 min</span>
  </div>
</div>

<div className="flex flex-col text-sm font-medium text-[#2e354d] w-60">
  <label className="mb-1">
    Rating <span className="font-semibold">{ratingRange[0]}★ - {ratingRange[1]}★</span>
  </label>
  <Range
    values={ratingRange}
    step={1}
    min={0}
    max={5}
    onChange={(values) => setRatingRange(values)}
    renderTrack={({ props, children }) => {
      const [minR, maxR] = ratingRange;
      const rangeMin = 0;
      const rangeMax = 5;
  
      const left = ((minR - rangeMin) / (rangeMax - rangeMin)) * 100;
      const width = ((maxR - minR) / (rangeMax - rangeMin)) * 100;
  
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
  <div className="flex justify-between text-xs text-gray-600 mt-1">
    <span>0★</span>
    <span>5★</span>
  </div>
</div>


    <select className="px-4 py-2 mt-6 bg-white/70 border border-gray-300 rounded-lg shadow-sm text-sm text-gray-700">
      <option>Amenities</option>
      <option>WiFi</option>
      <option>Gym</option>
      <option>Parking</option>
      <option>Pet Friendly</option>
    </select>

    <button
      onClick={() => setSelectedCity(null)}
      className="mt-6 text-blue-700 text-sm underline hover:text-blue-500"
    >
      Change City
    </button>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mt-14">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div
        key={i}
        onClick={() => navigate(`/housing/${i}`)}
        className="p-6 rounded-3xl bg-white/60 backdrop-blur-lg shadow-xl border border-white/30 hover:shadow-2xl hover:border-blue-300 cursor-pointer transition-all hover:scale-[1.015]"
      >
        <h3 className="text-xl font-semibold text-[#2e354d] mb-1">Listing #{i}</h3>
        <p className="text-gray-800 text-sm">$1,200/mo</p>
        <p className="text-gray-800 text-sm">20 min commute</p>
        <p className="text-yellow-500 text-sm">4.5★ rating</p>
        <p className="text-gray-700 text-sm">Includes WiFi & Gym</p>
      </div>
    ))}
  </div>

  <div className="flex justify-center mt-16">
    <div className="inline-flex rounded-lg shadow overflow-hidden border border-gray-300 bg-white/70 backdrop-blur-md">
      {[1, 2, 3, 4, 5].map((page) => (
        <button
          key={page}
          className="px-4 py-2 text-sm text-gray-800 hover:bg-[#eef2ff] hover:text-blue-600 transition"
        >
          {page}
        </button>
      ))}
      <button className="px-4 py-2 text-sm text-gray-800 hover:bg-[#eef2ff] hover:text-blue-600 transition">
        +
      </button>
    </div>
  </div>
</section>







    </motion.div>

    
  );
}
