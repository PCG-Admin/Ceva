import { NextRequest, NextResponse } from "next/server"

// Resolve shortened Google Maps URLs by following redirects
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Follow the redirect to get the final URL
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    })

    const finalUrl = response.url

    // Parse coordinates from the final URL
    const coords = parseGoogleMapsUrl(finalUrl)

    return NextResponse.json({
      originalUrl: url,
      resolvedUrl: finalUrl,
      coordinates: coords,
    })
  } catch (error) {
    console.error("Error resolving Maps URL:", error)
    return NextResponse.json({ error: "Failed to resolve URL" }, { status: 500 })
  }
}

// Parse Google Maps URL to extract coordinates
function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  try {
    // Priority 1: !3d and !4d in data parameter - this is the actual pin location
    const dataPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/
    const dataMatch = url.match(dataPattern)
    if (dataMatch) {
      return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) }
    }

    // Priority 2: ?q=lat,lng or ?ll=lat,lng - direct coordinate queries
    const queryPattern = /[?&](q|ll|query)=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const queryMatch = url.match(queryPattern)
    if (queryMatch) {
      return { lat: parseFloat(queryMatch[2]), lng: parseFloat(queryMatch[3]) }
    }

    // Priority 3: /place/lat,lng - place coordinates
    const placePattern = /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const placeMatch = url.match(placePattern)
    if (placeMatch) {
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) }
    }

    // Priority 4: @lat,lng in URL path - map center (least precise, fallback only)
    const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const atMatch = url.match(atPattern)
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
    }

    return null
  } catch {
    return null
  }
}
