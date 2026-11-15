import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { DesignScreen } from './components/design/DesignScreen';
import { FlightScreen } from './components/flight/FlightScreen';
import { HomeScreen } from './components/home/HomeScreen';
import { LobbyScreen } from './components/lobby/LobbyScreen';
import { ReportScreen } from './components/report/ReportScreen';
import { ToastStack } from './components/shared/ToastStack';
import { useDesignStore } from './store/useDesignStore';

function PhaseSync() {
  const phase = useDesignStore(s => s.phase);
  const showHome = useDesignStore(s => s.showHome);
  const navigate = useNavigate();

  useEffect(() => {
    if (showHome) {
      navigate('/', { replace: true });
      return;
    }
    const target =
      phase === 'DESIGN' ? '/design' : phase === 'FLIGHT' ? '/flight' : phase === 'REPORT' ? '/report' : '/lobby';
    navigate(target, { replace: true });
  }, [phase, showHome, navigate]);

  return null;
}

export default function App() {
  const openLobby = useDesignStore((state) => state.openLobby);

  return (
    <BrowserRouter>
      <PhaseSync />
      <Routes>
        <Route path="/" element={<HomeScreen onStart={() => openLobby()} />} />
        <Route path="/lobby" element={<LobbyScreen />} />
        <Route path="/design" element={<DesignScreen />} />
        <Route path="/flight" element={<FlightScreen />} />
        <Route path="/report" element={<ReportScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastStack />
    </BrowserRouter>
  );
}
