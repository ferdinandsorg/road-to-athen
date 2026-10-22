import type { MediaItem, Stage, StageDetail } from "@/types/data"

const useFixtures = import.meta.env.VITE_USE_FIXTURES === "true"

function dataBase(): string {
  return useFixtures ? "/fixtures/data" : "/data"
}

function mediaBase(): string {
  return useFixtures ? "/fixtures/media" : "/media"
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function resolveMediaUrl(path: string): string {
  if (path.startsWith("http") || path.startsWith("/fixtures/")) return path
  if (useFixtures && path.startsWith("/media/")) {
    return path.replace("/media/", "/fixtures/media/")
  }
  return path
}

export async function loadStages(): Promise<Stage[]> {
  return fetchJson<Stage[]>(`${dataBase()}/stages.json`)
}

export async function loadOverview(): Promise<GeoJSON.FeatureCollection> {
  return fetchJson(`${dataBase()}/overview.geojson`)
}

export async function loadStageDetail(nr: number): Promise<StageDetail> {
  return fetchJson(`${dataBase()}/stages/${nr}.json`)
}

export async function loadMedia(): Promise<MediaItem[]> {
  const items = await fetchJson<MediaItem[]>(`${dataBase()}/media.json`)
  return items.map((item) => ({
    ...item,
    thumb: resolveMediaUrl(item.thumb),
    medium: resolveMediaUrl(item.medium),
    video: item.video ? resolveMediaUrl(item.video) : undefined,
  }))
}

export { useFixtures, mediaBase }
