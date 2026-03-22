import React, { useState, useEffect, useCallback } from "react";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
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
    // Sirf naye search par upar scroll karein
    if (pageNum === 1) window.scrollTo({ top: 450, behavior: 'smooth' });
    
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${query}&per_page=40&page=${pageNum}`,
        { headers: { Authorization: PEXELS_API_KEY } }
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

  const handleNewSearch = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    searchImages(searchTerm, 1);
  };

  return (
    <div className="app">
      {/* PEXELS STYLE NAVBAR */}
      <nav className="navbar">
        <div className="logo" onClick={() => {setView("home"); setPage(1)}}>
          FreeStockHub
        </div>
        <div className="nav-right">
          <span onClick={() => {setView("home"); setPage(1)}} className={view === "home" ? "active" : ""}>Explore</span>
          <span onClick={() => setView("about")} className={view === "about" ? "active" : ""}>About</span>
          {user ? (
            <div className="user-area">
              <span className="user-name">👋 {user.email.split('@')[0]}</span>
              <button onClick={() => signOut(auth)} className="btn-logout-minimal">Logout</button>
            </div>
          ) : (
            <button className="btn-join">Join Now</button>
          )}
        </div>
      </nav>

      {view === "home" ? (
        <>
          {/* PEXELS STYLE HERO SECTION */}
          <section className="hero-section">
            <div className="hero-content">
              <h1>The best free stock photos shared by creators.</h1>
              <form className="hero-search-box" onSubmit={handleNewSearch}>
                <input 
                  type="text" 
                  placeholder="Search for free photos..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
                <button type="submit">🔍</button>
              </form>
              <p className="trending-tags">Trending: nature, wallpaper, city, sky</p>
            </div>
          </section>

          <div className="main-layout">
            <div className="gallery-wrapper">
              {/* MASONRY GRID */}
              <div className="masonry-grid">
                {images.map(img => (
                  <div key={img.id} className="pexels-card">
                    <img 
                      src={img.src.large} 
                      alt={img.alt} 
                      onClick={() => setSelectedImg(img.src.large2x)}
                    />
                    <div className="card-overlay">
                      <div className="photog-info">👤 {img.photographer}</div>
                      <div className="card-actions">
                        <button 
                          onClick={() => toggleFavorite(img)} 
                          className={`icon-btn ${favorites.find(fav => fav.id === img.id) ? 'active' : ''}`}
                        >
                          {favorites.find(fav => fav.id === img.id) ? "❤️" : "🤍"}
                        </button>
                        <button onClick={() => handleDownload(img.src.original, img.id)} className="icon-btn">📥</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* PAGINATION */}
              <div className="pagination-minimal">
                <button disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
                <span>Page {page}</span>
                <button onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>

            {/* SIDEBAR - FAVORITES */}
            <aside className="sidebar-favorites">
              <h3>❤️ Favorites ({favorites.length})</h3>
              <div className="fav-mini-grid">
                {favorites.map(fav => (
                  <img 
                    key={fav.id} 
                    src={fav.src.tiny} 
                    alt="Fav" 
                    onClick={() => setSelectedImg(fav.src.large)} 
                  />
                ))}
              </div>
            </aside>
          </div>
        </>
      ) : (
        <div className="about-full-page">
          <h2>About FreeStockHub</h2>
          <p>We provide high-quality, royalty-free stock images for everyone.</p>
          <button onClick={() => setView("home")} className="btn-back">Start Exploring</button>
        </div>
      )}

      {/* LIGHTBOX */}
      {selectedImg && (
        <div className="lightbox-full" onClick={() => setSelectedImg(null)}>
          <div className="lightbox-wrap">
            <span className="close-lb">&times;</span>
            <img src={selectedImg} alt="Zoomed" />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
      
