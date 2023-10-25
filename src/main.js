import './scss/style.scss'
import App from './App.svelte'

// Serve local webfonts during dev 
if (import.meta.env.DEV) {
  import("./scss/local-webfonts.scss")
} 

document.getElementById('elex-dashboard').innerHTML = ""
const app = new App({
  target: document.getElementById('elex-dashboard')
})

export default app
