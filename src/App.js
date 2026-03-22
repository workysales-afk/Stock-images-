import React, { useState, useEffect, useCallback } from "react";
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
import "./App.css";

const PEXELS_API_KEY = "AsAeHbkwF90qcWmKQnnnKC0VaAo43qobVoZSSbrlRinzRfDOTLjDoJMD";

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [images, setImages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("nature");
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search function ko bahar nikala taaki useEffect mein use ho sake
  const searchImages = useCallback(async (query = searchTerm) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${query}&per_page=20`,
        {
          headers: {
            Authorization: PEXELS_API_KEY
          }
        }
      );
      const data = await res.json();
      setImages(data.photos || []);
    } catch (error) {
      console.error("❌ Failed to load images.");
    }
    setLoading(false);
  }, [searchTerm]);

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
    // Website khulne par default images load hongi
    searchImages("nature");
  }, [searchImages]);

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

  // --- Naya Download Function ---
  const handleDownload = async (imageUrl, imageId) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `FreeStockHub-${imageId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert("❌ Download failed!");
    }
  };

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
            <div className="user-info-bar">
              <span className="user-email">👋 {user.email}</span>
              <button onClick={logout} className="btn-logout">Logout</button>
            </div>
          ) : (
            <span className="guest-badge">👤 Guest</span>
          )}
        </div>
      </header>

      <div className="main-content">
        <div className="search-section">
          <input 
            type="text" 
            placeholder="Search images (nature, city, food...)" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="search-input"
          />
          <button onClick={() => searchImages()} disabled={loading} className="btn-search">
            {loading ? "🔍..." : "🔍 Search"}
          </button>
        </div>

        {/* Auth Section for Guests */}
        {!user && (
          <div className="auth-container">
            <h2>🔐 Login / Register to Save Favorites</h2>
            <div className="auth-form">
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" />
              <div className="auth-buttons">
                <button onClick={login} className="btn-primary">Login</button>
                <button onClick={register} className="btn-secondary">Register</button>
              </div>
            </div>
          </div>
        )}

        {/* AdSense Banner */}
        <div className="adsense-banner">
          🚩 **Google AdSense Banner (728x90)**
        </div>

        <div className="content-grid">
          <div className="images-grid">
            {images.length > 0 ? (
              images.map(img => (
                <div key={img.id} className="image-card">
                  <img src={img.src.medium} alt={img.alt} className="image" />
                  <div className="image-info">
                    <span className="photog-name">📸 {img.photographer}</span>
                    <div className="card-actions">
                      <button onClick={() => toggleFavorite(img)} className={`fav-btn ${favorites.find(fav => fav.id === img.id) ? 'active' : ''}`}>
                        {favorites.find(fav => fav.id === img.id) ? "❤️" : "♡"}
                      </button>
                      {/* --- Naya Download Button --- */}
                      <button onClick={() => handleDownload(img.src.original, img.id)} className="download-btn-small">
                        📥
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p>Loading amazing images...</p>
            )}
          </div>

          <div className="sidebar">
            <h3>❤️ Favorites ({favorites.length})</h3>
            <div className="fav-list">
              {favorites.slice(0, 6).map(fav => (
                <img key={fav.id} src={fav.src.tiny} alt="Fav" className="fav-thumbnail" />
              ))}
            </div>
          </div>
        </div>

        <div className="adsense-sidebar">
          🚩 **Google AdSense Sidebar (300x250)**
        </div>
      </div>
    </div>
  );
}

export default App;
    
