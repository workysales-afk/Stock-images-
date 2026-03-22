import React, { useState, useEffect, useCallback } from "react";
import { auth, db } from "./firebase";
import { 
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
  const [images, setImages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("nature");
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedImg, setSelectedImg] = useState(null); 
  const [view, setView] = useState("home");

  const loadFavorites = useCallback(async (uid) => {
    try {
      const favDoc = doc(db, "favorites", uid);
      const favSnap = await getDoc(favDoc);
      if (favSnap.exists()) setFavorites(favSnap.data().images || []);
    } catch (error) { console.error("Error loading favorites:", error); }
  }, []);

  const searchImages = useCallback(async (query = searchTerm, pageNum = 1) => {
    setLoading(true);
    setView("home");
    window.scrollTo(0, 0);
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${query}&per_page=40&page=${pageNum}`,
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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        loadFavorites(u.uid);
      } else {
        setUser(null);
        setFavorites([]);
      }
    });
    searchImages(searchTerm, page);
    return () => unsubscribe();
  }, [page, searchImages, searchTerm, loadFavorites]);

  async function saveFavorites(uid, favs) {
    try { await setDoc(doc(db, "favorites", uid), { images: favs }); } 
    catch (error) { console.error("Error saving favorites:", error); }
  }

  const toggleFavorite = (img) => {
    if(!user) { alert("⚠️ Please login to save favorites"); return; }
    const exists = favorites.find(fav => fav.id === img.id);
    let newFavs = exists ? favorites.filter(fav => fav.id !== img.id) : [...favorites, img];
    setFavorites(newFavs);
    saveFavorites(user.uid, newFavs);
  };

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
      window.open(imageUrl, "_blank");
    }
  };

  const handleNewSearch = () => {
    setPage(1);
    searchImages(searchTerm, 1);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo-section">
          <h1 onClick={() => {setView("home"); setPage(1)}} style={{cursor:'pointer'}}>📸 FreeStockHub</h1>
        </div>
        
        <nav className="nav-links">
          <span onClick={() => {setView("home"); setPage(1)}} className={view === "home" ? "active" : ""}>Home</span>
          <span onClick={() => setView("about")} className={view === "about" ? "active" : ""}>About</span>
        </nav>

        <div className="user-section">
          {user ? (
            <div className="user-info-bar">
              <span className="user-email">👋 {user.email.split('@')[0]}</span>
              <button onClick={() => {signOut(auth); setView("home")}} className="btn-logout">Logout</button>
            </div>
          ) : (
            <span className="guest-badge">👤 Guest Mode</span>
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
              <button onClick={handleNewSearch} disabled={loading} className="btn-search">
                {loading ? "..." : "🔍 Search"}
              </button>
            </div>

            <div className="content-grid">
              <div className="images-grid">
                {images.map(img => (
                  <div key={img.id} className="image-card">
                    <img 
                      src={img.src.medium} 
                      alt={img.alt} 
                      className="image" 
                      onClick={() => setSelectedImg(img.src.large)}
                    />
                    <div className="image-info">
                      <span className="photog-name">👤 {img.photographer}</span>
                      <div className="card-actions">
                        <button 
                          onClick={() => toggleFavorite(img)} 
                          className={`fav-btn ${favorites.find(fav => fav.id === img.id) ? 'active' : ''}`}
                        >
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

            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="page-btn">Prev</button>
              <span className="page-indicator">Page {page}</span>
              <button onClick={() => setPage(page + 1)} className="page-btn">Next</button>
            </div>
          </>
        ) : (
          <div className="about-container">
            <h2>About FreeStockHub</h2>
            <p>Welcome to <strong>FreeStockHub</strong>, your go-to destination for high-quality, royalty-free images. Powered by Pexels API.</p>
            <button onClick={() => setView("home")} className="btn-search">Start Exploring</button>
          </div>
        )}
      </div>

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
                                   
