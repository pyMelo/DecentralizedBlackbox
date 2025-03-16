import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Home from "./components/Home"
import SUI from "./components/SUI"
import IOTA from "./components/IOTA"

function App() {
  console.log("App component rendered")
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sui" element={<SUI />} />
        <Route path="/iota" element={<IOTA />} />
      </Routes>
    </Router>
  )
}

export default App

