import { createRoot } from 'react-dom/client'
import { Builder } from './Builder.tsx'

const root = document.getElementById('root')
if (root) createRoot(root).render(<Builder />)
