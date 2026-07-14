const MAX_FILE_SIZE = 5 * 1024 * 1024

const allowedTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
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

  return `${url.origin}/api/question-images?key=${encodeURIComponent(key)}`
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
      'Failed to load question image:',
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
            'Images must be JPG, PNG, WebP or GIF.',
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

    const extension = allowedTypes[file.type]

    const key = [
      'questions',
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
        filename: file.name,
        contentType: file.type,
        size: file.size,
      },
      201,
    )
  } catch (error) {
    console.error(
      'Failed to upload question image:',
      error,
    )

    return json(
      {
        error:
          'Unable to upload the question image.',
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
        // The query parameter remains the preferred input.
      }
    }

    if (!key) {
      return json(
        { error: 'An image key is required.' },
        400,
      )
    }

    if (!key.startsWith('questions/')) {
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
        'Question image deleted successfully.',
    })
  } catch (error) {
    console.error(
      'Failed to delete question image:',
      error,
    )

    return json(
      {
        error:
          'Unable to delete the question image.',
      },
      500,
    )
  }
}