function json(data, status = 200) {
    return Response.json(data, {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
  
  function formatUser(user) {
    if (!user) return null
  
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role,
      avatar: user.avatar || '',
      isActive: Boolean(user.isActive),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
  
  export async function onRequestGet({ request, env }) {
    try {
      const url = new URL(request.url)
      const userId = url.searchParams.get('id')
      const role = url.searchParams.get('role')
  
      if (userId) {
        const user = await env.DB
          .prepare(`
            SELECT
              id,
              name,
              username,
              password,
              role,
              avatar,
              is_active AS isActive,
              created_at AS createdAt,
              updated_at AS updatedAt
            FROM users
            WHERE id = ?
          `)
          .bind(Number(userId))
          .first()
  
        if (!user) {
          return json({ error: 'User not found.' }, 404)
        }
  
        return json(formatUser(user))
      }
  
      let statement
  
      if (role) {
        statement = env.DB
          .prepare(`
            SELECT
              id,
              name,
              username,
              password,
              role,
              avatar,
              is_active AS isActive,
              created_at AS createdAt,
              updated_at AS updatedAt
            FROM users
            WHERE role = ?
            ORDER BY name ASC
          `)
          .bind(role)
      } else {
        statement = env.DB.prepare(`
          SELECT
            id,
            name,
            username,
            password,
            role,
            avatar,
            is_active AS isActive,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM users
          ORDER BY
            CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
            name ASC
        `)
      }
  
      const result = await statement.all()
  
      return json((result.results || []).map(formatUser))
    } catch (error) {
      console.error('Failed to load users:', error)
  
      return json(
        { error: 'Unable to load users.' },
        500,
      )
    }
  }
  
  export async function onRequestPost({ request, env }) {
    try {
      const body = await request.json()
  
      const name = String(body.name || '').trim()
      const username = String(body.username || '').trim()
      const password = String(body.password || '').trim()
      const role = body.role === 'admin' ? 'admin' : 'player'
      const avatar = String(body.avatar || '').trim() || null
  
      if (!name || !username || !password) {
        return json(
          {
            error: 'Name, username and password are required.',
          },
          400,
        )
      }
  
      const existingUser = await env.DB
        .prepare(`
          SELECT id
          FROM users
          WHERE LOWER(username) = LOWER(?)
        `)
        .bind(username)
        .first()
  
      if (existingUser) {
        return json(
          { error: 'That username is already being used.' },
          409,
        )
      }
  
      const result = await env.DB
        .prepare(`
          INSERT INTO users (
            name,
            username,
            password,
            role,
            avatar,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, 1)
        `)
        .bind(
          name,
          username,
          password,
          role,
          avatar,
        )
        .run()
  
      const createdUser = await env.DB
        .prepare(`
          SELECT
            id,
            name,
            username,
            password,
            role,
            avatar,
            is_active AS isActive,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM users
          WHERE id = ?
        `)
        .bind(result.meta.last_row_id)
        .first()
  
      return json(formatUser(createdUser), 201)
    } catch (error) {
      console.error('Failed to create user:', error)
  
      return json(
        { error: 'Unable to create the user.' },
        500,
      )
    }
  }
  
  export async function onRequestPatch({ request, env }) {
    try {
      const body = await request.json()
      const userId = Number(body.id)
  
      if (!userId) {
        return json(
          { error: 'A valid user ID is required.' },
          400,
        )
      }
  
      const existingUser = await env.DB
        .prepare(`
          SELECT *
          FROM users
          WHERE id = ?
        `)
        .bind(userId)
        .first()
  
      if (!existingUser) {
        return json({ error: 'User not found.' }, 404)
      }
  
      const name =
        body.name !== undefined
          ? String(body.name).trim()
          : existingUser.name
  
      const username =
        body.username !== undefined
          ? String(body.username).trim()
          : existingUser.username
  
      const password =
        body.password !== undefined
          ? String(body.password).trim()
          : existingUser.password
  
      const role =
        body.role !== undefined
          ? body.role === 'admin'
            ? 'admin'
            : 'player'
          : existingUser.role
  
      const avatar =
        body.avatar !== undefined
          ? String(body.avatar || '').trim() || null
          : existingUser.avatar
  
      const isActive =
        body.isActive !== undefined
          ? body.isActive
            ? 1
            : 0
          : existingUser.is_active
  
      if (!name || !username || !password) {
        return json(
          {
            error: 'Name, username and password cannot be empty.',
          },
          400,
        )
      }
  
      const usernameOwner = await env.DB
        .prepare(`
          SELECT id
          FROM users
          WHERE LOWER(username) = LOWER(?)
            AND id != ?
        `)
        .bind(username, userId)
        .first()
  
      if (usernameOwner) {
        return json(
          { error: 'That username is already being used.' },
          409,
        )
      }
  
      await env.DB
        .prepare(`
          UPDATE users
          SET
            name = ?,
            username = ?,
            password = ?,
            role = ?,
            avatar = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(
          name,
          username,
          password,
          role,
          avatar,
          isActive,
          userId,
        )
        .run()
  
      const updatedUser = await env.DB
        .prepare(`
          SELECT
            id,
            name,
            username,
            password,
            role,
            avatar,
            is_active AS isActive,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM users
          WHERE id = ?
        `)
        .bind(userId)
        .first()
  
      return json(formatUser(updatedUser))
    } catch (error) {
      console.error('Failed to update user:', error)
  
      return json(
        { error: 'Unable to update the user.' },
        500,
      )
    }
  }
  
  export async function onRequestDelete({ request, env }) {
    try {
      const body = await request.json()
      const userId = Number(body.id)
  
      if (!userId) {
        return json(
          { error: 'A valid user ID is required.' },
          400,
        )
      }
  
      const existingUser = await env.DB
        .prepare(`
          SELECT id, role
          FROM users
          WHERE id = ?
        `)
        .bind(userId)
        .first()
  
      if (!existingUser) {
        return json({ error: 'User not found.' }, 404)
      }
  
      await env.DB.batch([
        env.DB
          .prepare('DELETE FROM answers WHERE user_id = ?')
          .bind(userId),
  
        env.DB
          .prepare('DELETE FROM users WHERE id = ?')
          .bind(userId),
      ])
  
      return json({
        success: true,
        message: 'User deleted successfully.',
      })
    } catch (error) {
      console.error('Failed to delete user:', error)
  
      return json(
        { error: 'Unable to delete the user.' },
        500,
      )
    }
}