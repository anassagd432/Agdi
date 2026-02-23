import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { FeatureGrid } from './components/FeatureGrid'

function App() {
  return (
    <main className="min-h-screen bg-background text-white selection:bg-primary/30">
      {/* Dynamic Starfield / Grid Background Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      <Navbar />
      
      <div className="relative z-10 w-full overflow-hidden">
        <Hero />
        <FeatureGrid />
      </div>

      <footer className="relative border-t border-white/10 bg-background py-16 mt-20 z-10">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-400">
          <p className="mb-4 text-sm font-medium tracking-wide text-gray-500">
            © 2026 AGDI. Architecture designed for absolute autonomy.
          </p>
        </div>
      </footer>
    </main>
  )
}

export default App
