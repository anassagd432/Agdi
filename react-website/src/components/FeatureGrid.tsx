import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import type { MouseEvent } from 'react'

interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
  index: number
  colSpan?: 1 | 2
  rowSpan?: 1 | 2
  delay?: number
  children?: React.ReactNode
}

function HolographicCard({ title, description, icon, index, colSpan = 1, rowSpan = 1, delay = 0, children }: FeatureCardProps) {
  // Motion values for smooth 3D rotation
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  // Mouse coordinates for the glare overlay
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring configuration for silky smooth dampening
  const springConfig = { damping: 20, stiffness: 150, mass: 0.5 }
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), springConfig)
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), springConfig)

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    
    // Normalized coordinates (-0.5 to 0.5)
    const normX = (e.clientX - rect.left) / rect.width - 0.5
    const normY = (e.clientY - rect.top) / rect.height - 0.5
    
    x.set(normX)
    y.set(normY)
    
    // Pixel coordinates for radial gradient glare
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay }}
      className={`
        relative group rounded-[32px] p-1 flex flex-col isolation-auto
        overflow-hidden min-h-[350px]
        ${colSpan === 2 ? 'md:col-span-2' : 'col-span-1'}
        ${rowSpan === 2 ? 'md:row-span-2' : 'row-span-1'}
      `}
      style={{ perspective: 1500 }}
    >
      {/* 3D Transform Container */}
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ 
          rotateX, 
          rotateY,
          transformStyle: "preserve-3d" 
        }}
        className="absolute inset-0 z-10 
          bg-gradient-to-br from-white/[0.08] to-white/[0.01] 
          backdrop-blur-xl rounded-[32px] 
          shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_inset_0_-1px_1px_rgba(0,0,0,0.2),_0_10px_30px_-10px_rgba(0,0,0,0.5)]
          transition-colors duration-300 group-hover:border-white/20
          group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),_0_30px_60px_-15px_rgba(0,0,0,0.8),_0_0_40px_rgba(255,255,255,0.05)]
        "
      >
        {/* Dynamic Holographic Glare Overlay */}
        <motion.div
          style={{
            background: useTransform(
              [mouseX, mouseY],
              ([x, y]: [number, number]) => `radial-gradient(circle 800px at ${x}px ${y}px, rgba(255,255,255,0.15), transparent 40%)`
            ),
            translateZ: "1px"
          }}
          className="absolute inset-0 rounded-[31px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-overlay pointer-events-none"
        />

        {/* Content Parallax Wrapper */}
        <div 
          style={{ transformStyle: "preserve-3d" }}
          className="relative h-full p-10 flex flex-col z-20"
        >
          <motion.div 
            style={{ translateZ: "80px" }}
            className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center text-white mb-6 group-hover:border-white/40 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.2),_0_15px_35px_rgba(0,0,0,0.3)]"
          >
            {icon}
          </motion.div>

          <motion.h3 
            style={{ translateZ: "50px" }}
            className="text-2xl md:text-3xl font-extrabold mb-4 text-white tracking-tight drop-shadow-2xl"
          >
            {title}
          </motion.h3>

          <motion.p 
            style={{ translateZ: "30px" }}
            className="text-gray-400 text-lg leading-relaxed drop-shadow-lg"
          >
            {description}
          </motion.p>
          
          {/* Custom Injected Visual Content */}
          {children && (
             <motion.div style={{ translateZ: "40px" }} className="mt-8 flex-grow flex items-end relative z-30 w-full overflow-hidden">
                {children}
             </motion.div>
          )}

          {/* Large Faded Index Typography */}
          <motion.div 
            style={{ translateZ: "10px" }}
            className="absolute bottom-6 right-8 text-[120px] font-black text-white/[0.03] select-none pointer-events-none leading-none z-0 tracking-tighter"
          >
            0{index}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

import { Terminal, Bot, ShieldAlert, Cpu, Database, ScanLine } from 'lucide-react'

// Sub-components for Visual Injections
function TerminalMockup() {
  return (
    <div className="w-full bg-[#0d1117] rounded-xl border border-white/10 shadow-2xl p-4 font-mono text-xs overflow-hidden flex flex-col gap-2 relative">
       <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0d1117] to-transparent z-10" />
       <div className="flex gap-2">
         <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
         <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
         <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
       </div>
       <div className="mt-2 text-green-400">❯ agdi bind --target desktop --mode deep-root</div>
       <div className="text-gray-400 opacity-60">Initializing memory buffers...</div>
       <div className="text-gray-400 opacity-80 animate-pulse">[system] Awaiting X11 connection</div>
       <div className="text-primary font-bold">Connected.</div>
    </div>
  )
}

function ScannerGrid() {
  return (
    <div className="w-full h-full min-h-[120px] border border-secondary/20 rounded-xl relative overflow-hidden bg-black/40 flex items-center justify-center group-hover:border-secondary/50 transition-colors">
       <div className="absolute inset-0 bg-[linear-gradient(rgba(249,203,40,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(249,203,40,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
       <motion.div 
         animate={{ top: ["-10%", "110%"] }}
         transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
         className="absolute left-0 right-0 h-1 bg-secondary/80 blur-[2px] shadow-[0_0_15px_rgba(249,203,40,0.8)]"
       />
       <ScanLine className="w-12 h-12 text-secondary/30 relative z-10" />
    </div>
  )
}

function MemoryNodes() {
  return (
    <div className="w-full h-full min-h-[150px] relative mt-auto flex items-end pb-8">
      <div className="flex items-center justify-between w-full relative z-10 px-8">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-12 h-12 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(255,77,77,0.2)]"><Cpu className="w-5 h-5 text-primary" /></motion.div>
        <div className="h-px bg-gradient-to-r from-primary/50 to-secondary/50 flex-grow mx-4 relative">
          <motion.div animate={{ left: ["0%", "100%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute -top-1 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" />
        </div>
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2.2, repeat: Infinity, delay: 0.5 }} className="w-12 h-12 rounded-full border border-secondary/40 bg-secondary/10 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(249,203,40,0.2)]"><Database className="w-5 h-5 text-secondary" /></motion.div>
      </div>
    </div>
  )
}

export function FeatureGrid() {
  const features = [
    {
      title: "Native Device Control",
      description: "Full control over physical peripherals. AGDI binds directly to OS-level APIs across Windows, macOS, Linux, and Android seamlessly.",
      icon: <Terminal className="w-8 h-8" />,
      colSpan: 2 as const,
      rowSpan: 2 as const,
      delay: 0.1,
      children: <TerminalMockup />
    },
    {
      title: "Local Screen OCR",
      description: "Deciphers text directly from active pixel buffers using native system APIs locally. Millisecond latency routing without expensive cloud API calls.",
      icon: <ScanLine className="w-8 h-8" />,
      delay: 0.2,
      children: <ScannerGrid />
    },
    {
      title: "Natural Language Routing",
      description: "Translates plain English commands into exact native triggers instantly, bypassing heavy LLM latency streams for ultra-fast task execution.",
      icon: <Bot className="w-8 h-8" />,
      delay: 0.3
    },
    {
      title: "Persistent Memory",
      description: "By passively observing human workflows, AGDI builds dynamic memory profiles of GUI coordinates, state transitions, and usage patterns over time.",
      icon: <Cpu className="w-8 h-8" />,
      colSpan: 2 as const,
      rowSpan: 1 as const,
      delay: 0.4,
      children: <MemoryNodes />
    },
    {
      title: "Offensive Security Suite",
      description: "Full-stack pentesting layer. Nmap, SQLi, and payloads handled via autonomous playbooks.",
      icon: <ShieldAlert className="w-8 h-8" />,
      delay: 0.5
    }
  ]

  return (
    <section id="features" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-20 relative inline-block">
          {/* Subtle Glow Behind Text */}
          <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full opacity-50 pointer-events-none" />
          
          <motion.h2 
            initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="font-black tracking-tighter text-5xl md:text-7xl relative z-10"
          >
            <span className="text-white">Unprecedented</span>
            <br className="md:hidden" /> {/* Keep it inline on big screens, break on narrow */}
            <span className="glow-text md:ml-4">capability.</span>
          </motion.h2>

          {/* Animated Tech Accent Line */}
          <motion.div 
            initial={{ scaleX: 0, originX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="h-1.5 mt-8 bg-gradient-to-r from-primary via-secondary to-transparent rounded-full max-w-sm"
          />
        </div>

        {/* Asymmetric Bento Grid - uses grid-flow-dense to pack items nicely */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 grid-flow-row-dense">
          {features.map((feature, idx) => (
            <HolographicCard key={idx} index={idx + 1} {...feature} />
          ))}
        </div>
      </div>
    </section>
  )
}
