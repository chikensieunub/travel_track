import { StoreProvider } from './store/StoreProvider'
import { Board } from './components/Board'
import './App.css'

export default function App() {
  return (
    <StoreProvider>
      <Board />
    </StoreProvider>
  )
}
