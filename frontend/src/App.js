import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Home from "./components/Home"
import SUI from "./components/SUI"
import IOTA from "./components/IOTA"
import IOTAF from "./components/IOTAF"

function App() {
  console.log("App component rendered")
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sui" element={<SUI />} />
        <Route path="/iota" element={<IOTA />} />
        <Route path="/iotaf" element={<IOTAF />} />
      </Routes>
    </Router>
  )
}

export default App

