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

  // LOAD FAVORITES
  const loadFavorites = useCallback(async (uid) => {
    try {
      const favRef = doc(db, "favorites", uid);
      const favSnap = await getDoc(favRef);

      if (favSnap.exists()) {
        setFavorites(favSnap.data().images || []);
      }

    } catch (error) {
      console.error("Favorites load error:", error);
    }
  }, []);

  // SEARCH IMAGES
  const searchImages = useCallback(async (query = searchTerm, pageNum = 1) => {

    setLoading(true);
    setView("home");

    try {

      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${query}&per_page=40&page=${pageNum}`,
        {
          headers: { Authorization: PEXELS_API_KEY }
        }
      );

      if (!response.ok) throw new Error("API failed");

      const data = await response.json();

      setImages(data.photos || []);

      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {

      console.error("Image fetch error:", error);
      alert("⚠️ Failed to load images");

    }

    setLoading(false);

  }, [searchTerm]);

  // AUTH LISTENER
  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (u) => {

      if (u) {
        setUser(u);
        await loadFavorites(u.uid);
      } else {
        setUser(null);
        setFavorites([]);
      }

    });

    searchImages(searchTerm, page);

    return () => unsubscribe();

  }, [page, searchTerm, searchImages, loadFavorites]);


  // SAVE FAVORITES
  const saveFavorites = async (uid, favs) => {

    try {
      await setDoc(doc(db, "favorites", uid), { images: favs });
    } catch (error) {
      console.error("Favorites save error:", error);
    }

  };


  // TOGGLE FAVORITE
  const toggleFavorite = (img) => {

    if (!user) {
      alert("⚠️ Login required");
      return;
    }

    const exists = favorites.some(f => f.id === img.id);

    const newFavs = exists
      ? favorites.filter(f => f.id !== img.id)
      : [...favorites, img];

    setFavorites(newFavs);

    saveFavorites(user.uid, newFavs);

  };


  // DOWNLOAD IMAGE
  const handleDownload = async (url, id) => {

    try {

      const response = await fetch(url);
      const blob = await response.blob();

      const link = document.createElement("a");

      link.href = URL.createObjectURL(blob);
      link.download = `FreeStockHub-${id}.jpg`;

      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch {

      window.open(url, "_blank");

    }

  };


  const handleNewSearch = () => {

    setPage(1);
    searchImages(searchTerm, 1);

  };


  return (

    <div className="app">

      <header className="header">

        <h1
          style={{ cursor: "pointer" }}
          onClick={() => {
            setView("home");
            setPage(1);
          }}
        >
          📸 FreeStockHub
        </h1>

        <div>

          {user ? (
            <>
              <span>👋 {user.email.split("@")[0]}</span>
              <button onClick={() => signOut(auth)}>Logout</button>
            </>
          ) : (
            <span>👤 Guest Mode</span>
          )}

        </div>

      </header>


      {view === "home" && (

        <>
          <div className="search-section">

            <input
              type="text"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}

              onKeyDown={(e) => {
                if (e.key === "Enter") handleNewSearch();
              }}
            />

            <button onClick={handleNewSearch}>
              {loading ? "Loading..." : "Search"}
            </button>

          </div>


          <div className="images-grid">

            {images.map((img) => (

              <div key={img.id} className="image-card">

                <img
                  src={img.src.medium}
                  alt={img.alt}
                  onClick={() => setSelectedImg(img.src.large)}
                />

                <div>

                  <span>{img.photographer}</span>

                  <button onClick={() => toggleFavorite(img)}>
                    {favorites.some(f => f.id === img.id) ? "❤️" : "🤍"}
                  </button>

                  <button
                    onClick={() =>
                      handleDownload(img.src.original, img.id)
                    }
                  >
                    📥
                  </button>

                </div>

              </div>

            ))}

          </div>

          <div className="pagination">

            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Prev
            </button>

            <span>Page {page}</span>

            <button onClick={() => setPage(page + 1)}>
              Next
            </button>

          </div>

        </>

      )}


      {selectedImg && (

        <div
          className="lightbox-overlay"
          onClick={() => setSelectedImg(null)}
        >

          <img src={selectedImg} alt="Preview" />

        </div>

      )}

    </div>

  );
}

export default App;
