// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB975NkeXouvIjiNDuHqeS1rtssWHvZKnk",
  authDomain: "intern-housing-app.firebaseapp.com",
  projectId: "intern-housing-app",
  storageBucket: "intern-housing-app.firebasestorage.app",
  messagingSenderId: "678797203219",
  appId: "1:678797203219:web:376175da929c9dcedaece6",
  measurementId: "G-R9DFFN9RJZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };