function json(data, status = 200) {
    return Response.json(data, {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
  
  function formatUser(user) {
    return {
      id: Number(user.id),
      name: user.name,
      username: user.username,
      role: user.role,
      avatar: user.avatar || '',
      isActive: Boolean(user.isActive),
    }
  }
  
  export async function onRequestGet({
    request,
    env,
  }) {
    try {
      const url = new URL(request.url)
      const userId = Number(
        url.searchParams.get('id'),
      )
  
      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        return json(
          {
            success: false,
            error: 'A valid user ID is required.',
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
          WHERE id = ?
          LIMIT 1
        `)
        .bind(userId)
        .first()
  
      if (!user) {
        return json(
          {
            success: false,
            error:
              'This account no longer exists.',
          },
          404,
        )
      }
  
      if (!user.isActive) {
        return json(
          {
            success: false,
            error:
              'This account has been disabled.',
          },
          403,
        )
      }
  
      return json({
        success: true,
        user: formatUser(user),
      })
    } catch (error) {
      console.error(
        'Failed to validate current user:',
        error,
      )
  
      return json(
        {
          success: false,
          error:
            'Unable to validate the account.',
        },
        500,
      )
    }
  }