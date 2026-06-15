// Script temporal para asignar contraseña a un usuario por UID
// Uso: node scripts/reset-user-password.mjs <uid> <nueva-password>
// Ejemplo: node scripts/reset-user-password.mjs a0f5d3e8-8009-4655-bc07-64ede047ca86 MiPass123!

import { readFileSync } from 'fs'
import { resolve } from 'path'

const [, , uid, password] = process.argv

if (!uid || !password) {
  console.error('Uso: node scripts/reset-user-password.mjs <uid> <nueva-password>')
  process.exit(1)
}

// Leer credenciales directamente desde .env.local
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')

const getEnvVar = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match?.[1]?.trim()
}

const SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('No se encontraron las credenciales en .env.local')
  process.exit(1)
}

console.log(`Actualizando contraseña para UID: ${uid}`)
console.log(`Proyecto: ${SUPABASE_URL}`)

const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
  method: 'PUT',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ password }),
})

const data = await response.json()

if (!response.ok) {
  console.error('Error:', data)
  process.exit(1)
}

console.log('Contraseña actualizada correctamente.')
console.log(`Email: ${data.email}`)
console.log(`UID:   ${data.id}`)
