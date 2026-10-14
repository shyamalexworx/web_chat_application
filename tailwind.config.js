/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chat: {
          bg: '#0B0D12',
          surface: '#12151C',
          sidebar: '#0F1117',
          card: '#181C25',
          cardHover: '#1E2330',
          accent: '#4F8CFF',
          accentHover: '#3D7AE8',
          accentLight: 'rgba(79, 140, 255, 0.12)',
          text: '#F5F7FA',
          muted: '#929BAA',
          subtle: '#636D7E',
          border: '#252B36',
          borderLight: '#323A49',
          success: '#32C48D',
          warning: '#F5A623',
          danger: '#F05D6C',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ]
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'elevated': '0 8px 24px -4px rgba(0, 0, 0, 0.45), 0 4px 12px -2px rgba(0, 0, 0, 0.3)',
        'modal': '0 24px 48px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(37, 43, 54, 0.8)',
        'accent-glow': '0 0 20px -2px rgba(79, 140, 255, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [],
}
