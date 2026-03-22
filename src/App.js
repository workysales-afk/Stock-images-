import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  doc, 
  setDoc,
  getDoc
} from "firebase/firestore";
import "./App.css"; // We'll create this next

const PEXELS_API_KEY = "AsAeHbkwF90qcWmKQnnnKC0VaAo43qobVoZSSbrlRinzRfDOTLjDoJMD" // Get from https://www.pexels.com/api/

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [images, setImages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("nature");
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        loadFavorites(user.uid);
      } else {
        setUser(null);
        setFavorites([]);
      }
    });
  }, []);

  async function loadFavorites(uid) {
    try {
      const favDoc = doc(db, "favorites", uid);
      const favSnap = await getDoc(favDoc);
      if (favSnap.exists()) {
        setFavorites(favSnap.data().images || []);
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  }

  async function saveFavorites(uid, favs) {
    try {
      await setDoc(doc(db, "favorites", uid), { images: favs });
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  }

  const login = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("✅ Login successful!");
    } catch (error) {
      alert("❌ " + error.message);
    }
    setLoading(false);
  };

  const register = async () => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("✅ Registration successful!");
    } catch (error) {
      alert("❌ " + error.message);
    }
    setLoading(false);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const searchImages = async () => {
    setLoading(true);
    setImages([]);
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${searchTerm}&per_page=20`,
        {
          headers: {
            Authorization: PEXELS_API_KEY
          }
        }
      );
      const data = await res.json();
      setImages(data.photos || []);
    } catch (error) {
      alert("❌ Failed to load images. Check your Pexels API key.");
    }
    setLoading(false);
  };

  const toggleFavorite = (image) => {
    if(!user) {
      alert("⚠️ Please login to save favorites");
      return;
    }
    const exists = favorites.find(fav => fav.id === image.id);
    let newFavs;
    if (exists) {
      newFavs = favorites.filter(fav => fav.id !== image.id);
    } else {
      newFavs = [...favorites, image];
    }
    setFavorites(newFavs);
    saveFavorites(user.uid, newFavs);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>📸 FreeStockHub</h1>
        <div className="user-section">
          {user ? (
            <>
              <span>👋 {user.email}</span>
              <button onClick={logout} className="btn-logout">Logout</button>
            </>
          ) : (
            <>
              <span>👤 Guest</span>
            </>
          )}
        </div>
      </header>

      {!user ? (
        <div className="auth-container">
          <h2>🔐 Login / Register</h2>
          <div className="auth-form">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="input-field"
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="input-field"
            />
            <div className="auth-buttons">
              <button onClick={login} disabled={loading} className="btn-primary">
                {loading ? "Loading..." : "Login"}
              </button>
              <button onClick={register} disabled={loading} className="btn-secondary">
                {loading ? "Loading..." : "Register"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="main-content">
          <div className="search-section">
            <input 
              type="text" 
              placeholder="Search images (nature, city, food...)" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="search-input"
            />
            <button onClick={searchImages} disabled={loading} className="btn-search">
              {loading ? "🔍 Searching..." : "🔍 Search"}
            </button>
          </div>

          {/* AdSense Banner */}
          <div className="adsense-banner">
            🚩 **Google AdSense Banner (728x90) - Replace with your ad code**
          </div>

          <div className="content-grid">
            <div className="images-grid">
              {images.length > 0 ? (
                images.map(img => (
                  <div key={img.id} className="image-card">
                    <img 
                      src={img.src.medium} 
                      alt={img.alt} 
                      className="image"
                    />
                    <div className="image-info">
                      <span>📸 {img.photographer}</span>
                      <button 
                        onClick={() => toggleFavorite(img)} 
                        className={`fav-btn ${favorites.find(fav => fav.id === img.id) ? 'active' : ''}`}
                      >
                        {favorites.find(fav => fav.id === img.id) ? "❤️" : "♡"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p>🔍 Search for images above to get started!</p>
              )}
            </div>

            {/* Favorites Sidebar */}
            <div className="sidebar">
              <h3>❤️ My Favorites ({favorites.length})</h3>
              {favorites.slice(0, 4).map(fav => (
                <img 
                  key={fav.id} 
                  src={fav.src.tiny} 
                  alt="Favorite" 
                  className="fav-thumbnail"
                />
              ))}
              {favorites.length > 4 && <p>+{favorites.length - 4} more</p>}
            </div>
          </div>

          {/* AdSense Sidebar */}
          <div className="adsense-sidebar">
            🚩 **Google AdSense Sidebar (300x250) - Replace with your ad code**
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
