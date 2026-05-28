/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)', // Dinâmico via CSS Variable
        panel: 'var(--panel)',           // Dinâmico via CSS Variable
        border: 'var(--border)',         // Dinâmico via CSS Variable
        primary: '#3B82F6',     // Azul Sparkle vibrante
        secondary: '#8B5CF6',   // Violeta para acentos de alta performance
        accent: '#10B981',      // Verde esmeralda para status de sucesso
        danger: '#EF4444',      // Vermelho vibrante para avisos
        muted: '#64748B'        // Texto de apoio
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 15px rgba(59, 130, 246, 0.3)',
        'glow-secondary': '0 0 15px rgba(139, 92, 246, 0.3)',
        'glow-accent': '0 0 15px rgba(16, 185, 129, 0.3)',
      }
    },
  },
  plugins: [],
}
