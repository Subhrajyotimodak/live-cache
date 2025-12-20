import { useState, useEffect } from 'react';
import { createSandwich } from 'project-sandwich';
import './App.css';

function App() {
  const [sandwich, setSandwich] = useState(null);
  const [bread, setBread] = useState('wheat');
  const [filling, setFilling] = useState('cheese');
  const [description, setDescription] = useState('');

  // Initialize sandwich on mount
  useEffect(() => {
    const newSandwich = createSandwich({ bread, filling });
    setSandwich(newSandwich);
    setDescription(newSandwich.describe());
  }, []);

  const handleCreate = () => {
    const newSandwich = createSandwich({ bread, filling });
    setSandwich(newSandwich);
    setDescription(newSandwich.describe());
  };

  const handleUpdate = () => {
    if (sandwich) {
      sandwich.setBread(bread);
      sandwich.setFilling(filling);
      setDescription(sandwich.describe());
    }
  };

  const handleRandom = () => {
    const breads = ['wheat', 'white', 'rye', 'sourdough', 'multigrain'];
    const fillings = ['turkey', 'ham', 'cheese', 'vegetables', 'tuna', 'chicken'];
    
    const randomBread = breads[Math.floor(Math.random() * breads.length)];
    const randomFilling = fillings[Math.floor(Math.random() * fillings.length)];
    
    setBread(randomBread);
    setFilling(randomFilling);
    
    const newSandwich = createSandwich({ bread: randomBread, filling: randomFilling });
    setSandwich(newSandwich);
    setDescription(newSandwich.describe());
  };

  return (
    <div className="app">
      <div className="container">
        <h1>🥪 ProjectSandwich</h1>
        <p className="subtitle">React Example</p>
        
        <div className="form">
          <div className="input-group">
            <label htmlFor="breadType">Choose your bread:</label>
            <select 
              id="breadType"
              value={bread}
              onChange={(e) => setBread(e.target.value)}
            >
              <option value="wheat">Wheat</option>
              <option value="white">White</option>
              <option value="rye">Rye</option>
              <option value="sourdough">Sourdough</option>
              <option value="multigrain">Multigrain</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="fillingType">Choose your filling:</label>
            <input
              type="text"
              id="fillingType"
              value={filling}
              onChange={(e) => setFilling(e.target.value)}
              placeholder="e.g., turkey, cheese, vegetables"
            />
          </div>

          <div className="button-group">
            <button onClick={handleCreate} className="btn-primary">
              Create Sandwich
            </button>
            <button onClick={handleUpdate} className="btn-secondary">
              Update Sandwich
            </button>
            <button onClick={handleRandom} className="btn-random">
              Random Sandwich
            </button>
          </div>
        </div>

        {description && (
          <div className="result">
            <p className="result-text">{description}</p>
            {sandwich && (
              <div className="sandwich-info">
                <span className="info-item">🍞 {sandwich.getBread()}</span>
                <span className="info-item">🥙 {sandwich.getFilling()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

