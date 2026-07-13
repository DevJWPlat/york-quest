function json(data, status = 200) {
    return Response.json(data, {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
  
  export async function onRequestPost({ request, env }) {
    try {
      const body = await request.json()
  
      const username = String(body.username || '')
        .trim()
        .toLowerCase()
  
      const password = String(body.password || '').trim()
  
      if (!username || !password) {
        return json(
          {
            success: false,
            error: 'Enter your username and password.',
          },
          400,
        )
      }
  
      const user = await env.DB
        .prepare(`
          SELECT
            id,
            name,
            username,
            role,
            avatar,
            is_active AS isActive
          FROM users
          WHERE LOWER(username) = ?
            AND password = ?
          LIMIT 1
        `)
        .bind(username, password)
        .first()
  
      if (!user) {
        return json(
          {
            success: false,
            error: 'Your username or password is incorrect.',
          },
          401,
        )
      }
  
      if (!user.isActive) {
        return json(
          {
            success: false,
            error: 'This account has been disabled.',
          },
          403,
        )
      }
  
      return json({
        success: true,
        user: {
          id: Number(user.id),
          name: user.name,
          username: user.username,
          role: user.role,
          avatar: user.avatar || '',
          isActive: Boolean(user.isActive),
        },
      })
    } catch (error) {
      console.error('Failed to log in:', error)
  
      return json(
        {
          success: false,
          error: 'Unable to log in. Please try again.',
        },
        500,
      )
    }
  }