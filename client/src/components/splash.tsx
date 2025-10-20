import { useEffect, useState } from 'react';

function App() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, 2000); // Adjust the duration as needed

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="animate-pulse">
        <img 
          src="/tekpro-logo.png" 
          alt="TekPro Logo" 
          className="w-64 h-auto" // Adjust size as needed
        />
      </div>
    </div>
  );
}

export default App;
