import api from './client'

// Login — uses OAuth2PasswordRequestForm (application/x-www-form-urlencoded)
export const login = async (username, password) => {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)
  const { data } = await api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data // { access_token, token_type }
}

export const register = async (username, email, password) => {
  const { data } = await api.post('/auth/register', { username, email, password })
  return data
}

export const logout = async () => {
  await api.post('/auth/logout')
}

export const getMe = async () => {
  const { data } = await api.get('/auth/me')
  return data
}
