/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './*.js'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: '#DC2626',
                secondary: '#10B981',
                dark: '#0c0a09',
                panel: '#1c1917',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            }
        }
    },
    plugins: [],
};
