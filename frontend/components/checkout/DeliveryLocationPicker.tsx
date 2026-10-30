"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, LoaderCircle, LocateFixed, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, MapMouseEvent, Marker as MapLibreMarker } from "maplibre-gl";

export interface DeliveryLocationSelection {
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

type Suggestion = DeliveryLocationSelection;

const KENYA_BOUNDS = { south: -5, north: 5.5, west: 33.5, east: 42.5 };
const NAIROBI: [number, number] = [36.8219, -1.2921];

function isInKenya(latitude: number, longitude: number) {
  return latitude >= KENYA_BOUNDS.south && latitude <= KENYA_BOUNDS.north
    && longitude >= KENYA_BOUNDS.west && longitude <= KENYA_BOUNDS.east;
}

export default function DeliveryLocationPicker({
  value,
  onChange,
}: {
  value: DeliveryLocationSelection | null;
  onChange: (location: DeliveryLocationSelection | null) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ?? "";
  const mapNode = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<MapLibreMarker | null>(null);
  const reverseController = useRef<AbortController | null>(null);
  const [query, setQuery] = useState(value?.address ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  async function resolvePin(latitude: number, longitude: number) {
    if (!isInKenya(latitude, longitude)) {
      setMessage("Choose a location within Kenya.");
      onChange(null);
      return;
    }
    reverseController.current?.abort();
    const controller = new AbortController();
    reverseController.current = controller;
    const fallbackLocation = {
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      latitude,
      longitude,
      placeId: "",
    };
    setLocating(true);
    setMessage("");
    setQuery(fallbackLocation.address);
    onChange(fallbackLocation);
    try {
      const params = new URLSearchParams({
        lat: latitude.toFixed(6),
        lon: longitude.toFixed(6),
        format: "json",
        limit: "1",
      });
      if (apiKey) params.set("apiKey", apiKey);
      const reverseUrl = apiKey
        ? `https://api.geoapify.com/v1/geocode/reverse?${params}`
        : `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`;
      const response = await fetch(reverseUrl, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json();
      const result = data?.results?.[0] ?? data;
      const location = {
        address: String(result?.formatted || result?.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`).slice(0, 500),
        latitude,
        longitude,
        placeId: String(result?.place_id || result?.osm_id || "").slice(0, 255),
      };
      setQuery(location.address);
      onChange(location);
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMessage("");
    } finally {
      if (!controller.signal.aborted) setLocating(false);
    }
  }

  function movePin(location: DeliveryLocationSelection, zoom = 16) {
    marker.current?.setLngLat([location.longitude, location.latitude]);
    map.current?.flyTo({ center: [location.longitude, location.latitude], zoom });
    setQuery(location.address);
    setSuggestions([]);
    setMessage("");
    onChange(location);
  }

  useEffect(() => {
    if (!mapNode.current || map.current) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !mapNode.current) return;
      const instance = new maplibregl.Map({
        container: mapNode.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: value ? [value.longitude, value.latitude] : NAIROBI,
        zoom: value ? 16 : 10,
        attributionControl: apiKey ? false : { compact: true },
      });
      const pin = new maplibregl.Marker({ draggable: true })
        .setLngLat(value ? [value.longitude, value.latitude] : NAIROBI)
        .addTo(instance);
      pin.on("dragend", () => {
        const point = pin.getLngLat();
        void resolvePin(point.lat, point.lng);
      });
      instance.on("click", (event: MapMouseEvent) => {
        pin.setLngLat(event.lngLat);
        void resolvePin(event.lngLat.lat, event.lngLat.lng);
      });
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      instance.on("load", () => instance.resize());
      instance.on("error", () => setMessage("Map imagery could not load. Check your connection and reload the page."));
      resizeObserver = new ResizeObserver(() => instance.resize());
      resizeObserver.observe(mapNode.current);
      map.current = instance;
      marker.current = pin;
    });
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      reverseController.current?.abort();
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  // Map initialization is intentionally performed once per mounted delivery picker.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (query.trim().length < 3 || query === value?.address) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          text: query.trim().slice(0, 160), filter: "countrycode:ke",
          bias: `proximity:${NAIROBI[0]},${NAIROBI[1]}`, format: "json", limit: "5", apiKey,
        });
        const searchUrl = apiKey
          ? `https://api.geoapify.com/v1/geocode/autocomplete?${params}`
          : `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim().slice(0, 160))}&lat=${NAIROBI[1]}&lon=${NAIROBI[0]}&limit=8`;
        const response = await fetch(searchUrl, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json();
        const candidates = data?.results ?? data?.features ?? [];
        setSuggestions(candidates.flatMap((raw: Record<string, unknown>) => {
          const result = (raw.properties as Record<string, unknown> | undefined) ?? raw;
          const coordinates = (raw.geometry as { coordinates?: number[] } | undefined)?.coordinates;
          const latitude = Number(result.lat ?? coordinates?.[1]);
          const longitude = Number(result.lon ?? coordinates?.[0]);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isInKenya(latitude, longitude)) return [];
          const label = result.formatted || result.display_name || [result.name, result.street, result.city, result.state, result.country].filter(Boolean).join(", ");
          return [{
            address: String(label || "").slice(0, 500),
            latitude,
            longitude,
            placeId: String(result.place_id || result.osm_id || "").slice(0, 255),
          }];
        }));
      } catch (error) {
        if ((error as Error).name !== "AbortError") setMessage("Location search is temporarily unavailable.");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 600);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [apiKey, query, value?.address]);

  function useCurrentLocation() {
    setMessage("");
    if (!navigator.geolocation) {
      setMessage("Location access is not available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = { address: "", latitude: coords.latitude, longitude: coords.longitude, placeId: "" };
        marker.current?.setLngLat([coords.longitude, coords.latitude]);
        map.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 16 });
        void resolvePin(location.latitude, location.longitude);
      },
      () => {
        setLocating(false);
        setMessage("We could not use your current location. Search or choose a point on the map.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search delivery location"
            value={query}
            onChange={(event) => { setQuery(event.target.value.slice(0, 160)); onChange(null); setMessage(""); }}
            placeholder="Search your delivery area or address"
            autoComplete="off"
            className="pl-9"
          />
          {searching && <LoaderCircle className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-lg">
              {suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.placeId}-${suggestion.latitude}-${suggestion.longitude}`}
                  type="button"
                  className="flex w-full gap-2 border-b px-3 py-3 text-left text-sm last:border-0 hover:bg-muted"
                  onClick={() => movePin(suggestion)}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{suggestion.address}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating}>
          {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          Use my location
        </Button>
      </div>

      <div ref={mapNode} className="h-72 overflow-hidden rounded-lg border bg-muted" aria-label="Delivery location map" />
      <p className="text-xs text-muted-foreground">Search above, click the map, or drag the pin to your exact delivery point.</p>

      {value && <p className="flex items-center gap-2 text-sm font-medium text-primary"><CheckCircle2 className="h-4 w-4" /> Delivery location confirmed</p>}
      {message && <p className="text-sm text-destructive" role="alert">{message}</p>}
      <p className="text-[11px] text-muted-foreground">
        Map data Â© OpenStreetMap contributors Â· Powered by OpenFreeMap
      </p>
    </section>
  );
}
