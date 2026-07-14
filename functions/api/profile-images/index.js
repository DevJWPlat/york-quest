const MAX_FILE_SIZE = 5 * 1024 * 1024

const allowedTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

function getImageKey(request) {
  const url = new URL(request.url)

  return String(
    url.searchParams.get('key') || '',
  ).trim()
}

function createImageUrl(request, key) {
  const url = new URL(request.url)

  return `${url.origin}/api/profile-images?key=${encodeURIComponent(key)}`
}

export async function onRequestGet({
  request,
  env,
}) {
  try {
    const key = getImageKey(request)

    if (!key) {
      return json(
        { error: 'An image key is required.' },
        400,
      )
    }

    if (!key.startsWith('profiles/')) {
      return json(
        { error: 'Invalid image key.' },
        400,
      )
    }

    const object = await env.IMAGES.get(key)

    if (!object) {
      return json(
        { error: 'Image not found.' },
        404,
      )
    }

    const headers = new Headers()

    object.writeHttpMetadata(headers)

    headers.set('etag', object.httpEtag)

    headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable',
    )

    return new Response(object.body, {
      headers,
    })
  } catch (error) {
    console.error(
      'Failed to load profile image:',
      error,
    )

    return json(
      { error: 'Unable to load the image.' },
      500,
    )
  }
}

export async function onRequestPost({
  request,
  env,
}) {
  try {
    const formData = await request.formData()
    const file = formData.get('image')
    const userId = Number(formData.get('userId'))

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return json(
        { error: 'A valid user ID is required.' },
        400,
      )
    }

    if (!(file instanceof File)) {
      return json(
        { error: 'Please choose an image.' },
        400,
      )
    }

    if (!allowedTypes[file.type]) {
      return json(
        {
          error:
            'Profile images must be JPG, PNG or WebP.',
        },
        400,
      )
    }

    if (file.size <= 0) {
      return json(
        { error: 'The selected image is empty.' },
        400,
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return json(
        {
          error:
            'The image must be smaller than 5MB.',
        },
        400,
      )
    }

    const existingUser = await env.DB
      .prepare(`
        SELECT
          id,
          avatar
        FROM users
        WHERE id = ?
          AND is_active = 1
      `)
      .bind(userId)
      .first()

    if (!existingUser) {
      return json(
        {
          error:
            'The user could not be found or is disabled.',
        },
        404,
      )
    }

    const extension = allowedTypes[file.type]

    const key = [
      'profiles',
      String(userId),
      `${Date.now()}-${crypto.randomUUID()}.${extension}`,
    ].join('/')

    await env.IMAGES.put(
      key,
      await file.arrayBuffer(),
      {
        httpMetadata: {
          contentType: file.type,
          cacheControl:
            'public, max-age=31536000, immutable',
        },

        customMetadata: {
          userId: String(userId),
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      },
    )

    return json(
      {
        success: true,
        key,
        url: createImageUrl(request, key),
        previousAvatar:
          existingUser.avatar || '',
        filename: file.name,
        contentType: file.type,
        size: file.size,
      },
      201,
    )
  } catch (error) {
    console.error(
      'Failed to upload profile image:',
      error,
    )

    return json(
      {
        error:
          'Unable to upload the profile image.',
      },
      500,
    )
  }
}

export async function onRequestDelete({
  request,
  env,
}) {
  try {
    let key = getImageKey(request)

    if (!key) {
      try {
        const body = await request.json()

        key = String(body.key || '').trim()
      } catch {
        // Query parameter remains supported.
      }
    }

    if (!key) {
      return json(
        { error: 'An image key is required.' },
        400,
      )
    }

    if (!key.startsWith('profiles/')) {
      return json(
        { error: 'Invalid image key.' },
        400,
      )
    }

    const existingObject =
      await env.IMAGES.head(key)

    if (!existingObject) {
      return json(
        { error: 'Image not found.' },
        404,
      )
    }

    await env.IMAGES.delete(key)

    return json({
      success: true,
      message:
        'Profile image deleted successfully.',
    })
  } catch (error) {
    console.error(
      'Failed to delete profile image:',
      error,
    )

    return json(
      {
        error:
          'Unable to delete the profile image.',
      },
      500,
    )
  }
}