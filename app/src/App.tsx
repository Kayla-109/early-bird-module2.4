import { useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import CorridorSpaces from './sections/CorridorSpaces';
import Navbar from './sections/Navbar';
import HeroSection from './sections/HeroSection';
import MetricsDashboard from './sections/MetricsDashboard';
import CinematicDepthText from './sections/CinematicDepthText';
import BentoGrid from './sections/BentoGrid';
import InsightsSection from './sections/InsightsSection';
import Footer from './sections/Footer';
import DashboardLayout from './pages/DashboardLayout';
import DashboardOverview from './pages/DashboardOverview';
import ForecastPage from './pages/ForecastPage';
import ReplenishmentPage from './pages/ReplenishmentPage';
import InventoryPage from './pages/InventoryPage';
import PolicyPage from './pages/PolicyPage';
import AlertsPage from './pages/AlertsPage';

gsap.registerPlugin(ScrollTrigger);

function LandingPage() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tickerCallback = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    const images = document.querySelectorAll('img');
    let loadedCount = 0;
    const totalImages = images.length;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalImages) ScrollTrigger.refresh();
    };
    images.forEach((img) => {
      if (img.complete) checkAllLoaded();
      else { img.addEventListener('load', checkAllLoaded); img.addEventListener('error', checkAllLoaded); }
    });
    const refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 2000);

    return () => {
      clearTimeout(refreshTimer);
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="relative">
      <CorridorSpaces />
      <Navbar />
      <HeroSection />
      <main className="relative" style={{ zIndex: 10, backgroundColor: '#0A0C10' }}>
        <MetricsDashboard />
        <CinematicDepthText />
        <BentoGrid />
        <InsightsSection />
        <Footer />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardOverview />} />
        <Route path="forecast" element={<ForecastPage />} />
        <Route path="replenishment" element={<ReplenishmentPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="policy" element={<PolicyPage />} />
        <Route path="alerts" element={<AlertsPage />} />
      </Route>
    </Routes>
  );
}
