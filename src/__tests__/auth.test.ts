import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { POST as register } from '@/app/api/auth/register/route'
import { POST as login } from '@/app/api/auth/login/route'

function makeRequest(path: string, body: object) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/register', () => {
  it('creates a new user and returns 201 with a session cookie', async () => {
    const res = await register(
      makeRequest('/api/auth/register', {
        name: 'Test User',
        email: 'new@test.taskflow',
        password: 'password123',
      })
    )

    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.user.email).toBe('new@test.taskflow')
    expect(body.user.password).toBeUndefined()

    const cookie = res.headers.get('set-cookie')
    expect(cookie).toContain('token=')
    expect(cookie).toContain('HttpOnly')
  })

  it('returns 400 with a field error when the email is already taken', async () => {
    await prisma.user.create({
      data: {
        name: 'Existing User',
        email: 'taken@test.taskflow',
        password: await bcrypt.hash('irrelevant', 12),
      },
    })

    const res = await register(
      makeRequest('/api/auth/register', {
        name: 'Another User',
        email: 'taken@test.taskflow',
        password: 'password123',
      })
    )

    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toBe('validation failed')
    expect(body.fields.email).toBeDefined()
  })
})

describe('POST /api/auth/login', () => {
  it('returns 401 when the password is wrong', async () => {
    await prisma.user.create({
      data: {
        name: 'Login Test',
        email: 'login@test.taskflow',
        password: await bcrypt.hash('correctpassword', 12),
      },
    })

    const res = await login(
      makeRequest('/api/auth/login', {
        email: 'login@test.taskflow',
        password: 'wrongpassword',
      })
    )

    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBe('unauthorized')
  })
})
