import { useEffect } from 'react';
import { DesignScreen } from './components/design/DesignScreen';
import { FlightScreen } from './components/flight/FlightScreen';
import { HomeScreen } from './components/home/HomeScreen';
import { LobbyScreen } from './components/lobby/LobbyScreen';
import { ReportScreen } from './components/report/ReportScreen';
import { ToastStack } from './components/shared/ToastStack';
import { useDesignStore } from './store/useDesignStore';

export default function App() {
  const connect = useDesignStore((state) => state.connect);
  const showHome = useDesignStore((state) => state.showHome);
  const hasRoom = useDesignStore((state) => state.hasRoom);
  const phase = useDesignStore((state) => state.phase);
  const openLobby = useDesignStore((state) => state.openLobby);

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <>
      {showHome ? (
        <HomeScreen onStart={openLobby} />
      ) : !hasRoom || phase === 'LOBBY' ? (
        <LobbyScreen />
      ) : phase === 'DESIGN' ? (
        <DesignScreen />
      ) : phase === 'FLIGHT' ? (
        <FlightScreen />
      ) : (
        <ReportScreen />
      )}
      <ToastStack />
    </>
  );
}
