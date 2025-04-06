import { useState } from 'react'
import './App.css'
import JapanMap from './components/JapanMap'

function App() {
  const [language, setLanguage] = useState('en');

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ja' : 'en');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌸 Tenki Yohohoho</h1>
        <p>{language === 'en' ? 'Interactive Japanese Weather Map' : '日本の天気予報インタラクティブマップ'}</p>
        <button onClick={toggleLanguage} className="language-toggle">
          {language === 'en' ? '🇯🇵' : '🇬🇧'}
        </button>
      </header>

      <main className="app-main">
        <JapanMap language={language} />
      </main>

      <footer className="app-footer">
        <p>
          © 2024 Tenki Yohohoho | 
          {language === 'en' 
            ? 'Weather data provided by Open-Meteo' 
            : '天気データはOpen-Meteoによって提供されています'}
        </p>
      </footer>
    </div>
  )
}

export default App
