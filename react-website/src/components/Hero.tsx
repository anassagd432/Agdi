import { motion } from 'framer-motion'
import { Terminal } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
      {/* Abstract Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Version 3.0 — Security Suite + 100 Kali Tools Live
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8"
        >
          The Operating System<br className="hidden md:block" />
          for <span className="glow-text">General Intelligence.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          AGDI isn't just a copilot. It's an autonomous agent that sees your screen, controls your mouse, types on your keyboard, and executes complex workflows natively.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex items-center justify-center gap-4 mb-16"
        >
            <a href="#install" className="bg-gradient-to-r from-primary to-secondary text-black px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity">Install AGDI CLI</a>
            <a href="#vision" className="glass text-white px-6 py-3 rounded-full font-semibold hover:bg-white/5 transition-colors">Explore Capabilities</a>
        </motion.div>

        {/* AGDI Mockup Window */}
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl translate-z-0"
        >
            <div className="relative rounded-2xl bg-[#0d1117] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden text-left font-mono text-sm leading-relaxed">
                <div className="flex items-center px-4 py-3 border-b border-white/10 bg-[#161b22]">
                    <div className="flex gap-2 mr-4">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                    </div>
                    <div className="text-gray-400 text-xs font-semibold flex items-center gap-2">
                        <Terminal className="w-3 h-3" />
                        agdi-agent-daemon
                    </div>
                </div>
                <div className="p-6 text-gray-300">
                    <div className="mb-4">
                        <span className="text-primary mr-2">❯</span>
                        <span className="text-green-400 font-bold">agdi</span>
                        <span className="text-gray-400 ml-2">agent --start</span>
                    </div>
                    <div className="mb-1"><span className="text-blue-400 mr-2">[sys]</span> Initializing native drivers (Linux/X11)... <span className="text-green-400">OK</span></div>
                    <div className="mb-1"><span className="text-blue-400 mr-2">[sys]</span> Security suite loaded — <span className="text-secondary">87/100 Kali tools</span> available</div>
                    <div className="mb-6"><span className="text-purple-400 mr-2">[nl]</span> Listening for commands...</div>
                    
                    <div className="mb-6 pl-4 border-l-2 border-white/10 italic text-gray-400">
                        <span className="font-bold text-white not-italic mr-2">User:</span>
                        "Scan 10.0.0.0/24 for open ports, check web vulns on any HTTP servers, and capture WiFi handshakes."
                    </div>
                    
                    <div className="mb-2"><span className="text-yellow-400 mr-2">[plan]</span> Delegating 3 sub-agents: <span className="text-white font-semibold flex flex-wrap gap-2 mt-1">NetworkRecon → WebScanner → WifiSecurity</span></div>
                    <div className="text-gray-500 animate-pulse"><span className="text-red-400 mr-2">[exec]</span> Agent-1: SYN scan 254 hosts on ports 1-65535...</div>
                </div>
            </div>
        </motion.div>
      </div>
    </section>
  )
}
