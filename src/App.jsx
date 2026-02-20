import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import LandingPage from './components/LandingPage';
import BrazilMap from './components/BrazilMap';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // add this

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // add this
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>; // add this

  return (
    <div>
      {user ? <BrazilMap user={user} /> : <LandingPage />}
    </div>
  );
}

export default App;