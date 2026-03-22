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
  
  // Naye States: Zoom aur Page View ke liye
  const [selectedImg, setSelectedImg] = useState(null); 
  const [view, setView] = useState("home"); // "home" ya "about"

  const searchImages = useCallback(async (query = searchTerm) => {
    setLoading(true);
    setView("home"); // Search karne par Gallery page par le jayega
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${query}&per_page=20`,
        {
          headers: { Authorization: PEXELS_API_KEY }
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
    searchImages("nature");
  }, [searchImages]);

  async function loadFavorites(uid) {
    try {
      const favDoc = doc(db, "favorites", uid);
      const favSnap = await getDoc(favDoc);
      if (favSnap.exists()) setFavorites(favSnap.data().images || []);
    } catch (error) { console.error(error); }
  }

  async function saveFavorites(uid, favs) {
    try { await setDoc(doc(db, "favorites", uid), { images: favs }); } catch (error) { console.error(error); }
  }

  // --- Optimized Download Function ---
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
      window.open(imageUrl, "_blank"); // Fallback agar fetch block ho
    }
  };

  const logout = async () => { await signOut(auth); setView("home"); };

  const toggleFavorite = (image) => {
    if(!user) { alert("⚠️ Please login to save favorites"); return; }
    const exists = favorites.find(fav => fav.id === image.id);
    let newFavs = exists ? favorites.filter(fav => fav.id !== image.id) : [...favorites, image];
    setFavorites(newFavs);
    saveFavorites(user.uid, newFavs);
  };

  return (
    <div className="app">
      {/* --- MENU / NAVIGATION --- */}
      <header className="header">
        <div className="logo-section">
          <h1 onClick={() => setView("home")} style={{cursor:'pointer'}}>📸 FreeStockHub</h1>
        </div>
        
        <nav className="nav-links">
          <span onClick={() => setView("home")} className={view === "home" ? "active" : ""}>Home</span>
          <span onClick={() => setView("about")} className={view === "about" ? "active" : ""}>About</span>
        </nav>

        <div className="user-section">
          {user ? (
            <div className="user-info-bar">
              <span className="user-email">👋 {user.email.split('@')[0]}</span>
              <button onClick={logout} className="btn-logout">Logout</button>
            </div>
          ) : (
            <span className="guest-badge">👤 Guest</span>
          )}
        </div>
      </header>

      <div className="main-content">
        {view === "home" ? (
          <>
            <div className="search-section">
              <input 
                type="text" 
                placeholder="Search images..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="search-input"
              />
              <button onClick={() => searchImages()} disabled={loading} className="btn-search">
                {loading ? "..." : "🔍 Search"}
              </button>
            </div>

            {!user && (
              <div className="auth-container">
                <h3>🔐 Login to Save Favorites</h3>
                <div className="auth-form-row">
                  <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} className="input-field-small" />
                  <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} className="input-field-small" />
                  <button onClick={() => signInWithEmailAndPassword(auth, email, password)} className="btn-primary-small">Login</button>
                </div>
              </div>
            )}

            <div className="content-grid">
              <div className="images-grid">
                {images.map(img => (
                  <div key={img.id} className="image-card">
                    {/* PHOTO CLICK/ZOOM: Image par click karne par selectedImg set hoga */}
                    <img 
                      src={img.src.medium} 
                      alt={img.alt} 
                      className="image" 
                      onClick={() => setSelectedImg(img.src.large)}
                    />
                    <div className="image-info">
                      <span className="photog-name">👤 {img.photographer}</span>
                      <div className="card-actions">
                        <button onClick={() => toggleFavorite(img)} className={`fav-btn ${favorites.find(fav => fav.id === img.id) ? 'active' : ''}`}>
                          {favorites.find(fav => fav.id === img.id) ? "❤️" : "♡"}
                        </button>
                        <button onClick={() => handleDownload(img.src.original, img.id)} className="download-btn-small">📥</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="sidebar">
                <h3>❤️ Favorites ({favorites.length})</h3>
                <div className="fav-list">
                  {favorites.slice(0, 6).map(fav => (
                    <img key={fav.id} src={fav.src.tiny} alt="Fav" className="fav-thumbnail" onClick={() => setSelectedImg(fav.src.large)} />
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* --- ABOUT SECTION --- */
          <div className="about-container">
            <h2>About FreeStockHub</h2>
            <p>Welcome to <strong>FreeStockHub</strong>, your go-to destination for high-quality, royalty-free images. Our platform is powered by the Pexels API, giving you access to millions of beautiful photos.</p>
            <p>Whether you're a blogger, designer, or social media enthusiast, you can search, view, and download images for free!</p>
            <button onClick={() => setView("home")} className="btn-primary">Start Exploring</button>
          </div>
        )}
      </div>

      {/* --- LIGHTBOX / ZOOM MODAL --- */}
      {selectedImg && (
        <div className="lightbox-overlay" onClick={() => setSelectedImg(null)}>
          <div className="lightbox-content">
            <span className="close-btn">&times;</span>
            <img src={selectedImg} alt="Zoomed" className="zoom-img" />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
  
