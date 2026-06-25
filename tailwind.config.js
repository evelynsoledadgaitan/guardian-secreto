/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        body: ['"Manrope"', 'sans-serif']
      },
      colors: {
        ember: {
          50: '#fdf3e9',
          100: '#f8e2c4',
          300: '#eab165',
          500: '#d97a1f',
          600: '#b5610f',
          700: '#8f4a0c'
        },
        night: {
          900: '#0f1410',
          800: '#161d17',
          700: '#1f2a20',
          600: '#2b3a2c'
        },
        jade: {
          400: '#5fae8a',
          500: '#3c8a68',
          600: '#2c6b4f'
        },
        mapuche: '#7c3aed',
        guarani: '#65a30d',
        mocovi: '#ea580c'
      },
      backgroundImage: {
        'weave': "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)"
      },
      animation: {
        'fade-up': 'fadeUp .6s ease-out forwards',
        'glow-pulse': 'glowPulse 2.4s ease-in-out infinite',
        'reveal': 'reveal .9s cubic-bezier(.2,.8,.2,1) forwards'
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 0px rgba(217,122,31,0.0)' },
          '50%': { boxShadow: '0 0 28px rgba(217,122,31,0.45)' }
        },
        reveal: {
          '0%': { opacity: 0, transform: 'scale(.85)' },
          '60%': { opacity: 1, transform: 'scale(1.04)' },
          '100%': { opacity: 1, transform: 'scale(1)' }
        }
      }
    }
  },
  plugins: []
}
