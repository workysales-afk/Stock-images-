import React, { useState, useEffect, useCallback } from "react";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "./App.css";

const PEXELS_API_KEY = "AsAeHbkwF90qcWmKQnnnKC0VaAo43qobVoZSSbrlRinzRfDOTLjDoJMD";

function App() {
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("Nature");
  const [favorites, setFavorites] = useState([]);
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
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${query}&per_page=30&page=${pageNum}`,
        { headers: { Authorization: PEXELS_API_KEY } }
      );
      const data = await res.json();
      setImages(data.photos || []);
    } catch (error) { console.error("❌ API Error"); }
  }, [searchTerm]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) { setUser(u); loadFavorites(u.uid); } 
      else { setUser(null); setFavorites([]); }
    });
    searchImages(searchTerm, page);
    return () => unsubscribe();
  }, [page, searchImages, searchTerm, loadFavorites]);

  const toggleFavorite = async (img) => {
    if(!user) { alert("Please login to save favorites!"); return; }
    const exists = favorites.find(fav => fav.id === img.id);
    let newFavs = exists ? favorites.filter(fav => fav.id !== img.id) : [...favorites, img];
    setFavorites(newFavs);
    await setDoc(doc(db, "favorites", user.uid), { images: newFavs });
  };

  const handleDownload = async (url, id) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `FreeStockHub-${id}.jpg`;
      link.click();
    } catch (err) { window.open(url, "_blank"); }
  };

  const onSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    searchImages(searchTerm, 1);
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" onClick={() => {setView("home"); setPage(1)}}>FreeStockHub</div>
          <div className="nav-links">
            <span onClick={() => setView("home")} className={view === "home" ? "active" : ""}>Explore</span>
            <span onClick={() => setView("about")} className={view === "about" ? "active" : ""}>License</span>
            {user ? (
              <div className="user-profile">
                <img src={`https://ui-avatars.com/api/?name=${user.email}&background=random`} alt="avatar" className="avatar"/>
                <button onClick={() => signOut(auth)} className="btn-logout">Logout</button>
              </div>
            ) : (
              <button className="btn-join">Join</button>
            )}
          </div>
        </div>
      </nav>

      {view === "home" ? (
        <>
          <header className="hero">
            <div className="hero-inner">
              <h1>The best free stock photos shared by talented creators.</h1>
              <form className="hero-search" onSubmit={onSearchSubmit}>
                <button type="submit" className="search-icon-btn">🔍</button>
                <input 
                  type="text" 
                  placeholder="Search for free photos" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
              </form>
              <div className="trending">
                <span>Trending:</span>
                <p onClick={() => {setSearchTerm("Sky"); setPage(1)}}>sky, </p>
                <p onClick={() => {setSearchTerm("Forest"); setPage(1)}}>forest, </p>
                <p onClick={() => {setSearchTerm("Tech"); setPage(1)}}>tech</p>
              </div>
            </div>
          </header>

          <main className="main-layout">
            <div className="gallery-section">
              <div className="section-header"><h2>Free Stock Photos</h2></div>
              <div className="masonry-grid">
                {images.map(img => (
                  <div key={img.id} className="pexels-card" onClick={() => setSelectedImg(img.src.large2x)}>
                    <img src={img.src.large} alt={img.alt} loading="lazy" />
                    <div className="card-hover">
                      <div className="photographer"><span>{img.photographer}</span></div>
                      <div className="actions" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleFavorite(img)} className="act-btn">
                          {favorites.find(f => f.id === img.id) ? "❤️" : "🤍"}
                        </button>
                        <button onClick={() => handleDownload(img.src.original, img.id)} className="act-btn">📥</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage(page - 1)} className="pg-btn">Previous</button>
                <div className="pg-numbers"><span className="active-pg">{page}</span></div>
                <button onClick={() => setPage(page + 1)} className="pg-btn">Next Page</button>
              </div>
            </div>

            <aside className="sidebar">
              <h3>❤️ Collected ({favorites.length})</h3>
              <div className="fav-scroll">
                {favorites.map(fav => (
                  <div key={fav.id} className="fav-item" onClick={() => setSelectedImg(fav.src.large)}>
                    <img src={fav.src.tiny} alt="fav" />
                  </div>
                ))}
              </div>
            </aside>
          </main>
        </>
      ) : (
        <div className="license-view">
          <h2>License</h2>
          <p>All photos are free to use. Powered by Pexels.</p>
          <button onClick={() => setView("home")} className="btn-back">Explore</button>
        </div>
      )}

      {selectedImg && (
        <div className="lightbox-overlay" onClick={() => setSelectedImg(null)}>
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImg} alt="fullsize" />
            <button className="close-lightbox" onClick={() => setSelectedImg(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
        
