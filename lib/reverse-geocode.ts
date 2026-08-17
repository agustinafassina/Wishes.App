export async function reverseGeocodeCountry(
  lat: number,
  lng: number
): Promise<{ name: string; code: string }> {
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lng),
      zoom: '3',
      addressdetails: '1',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { name: '', code: '' };
    const data = (await res.json()) as {
      address?: { country?: string; country_code?: string };
    };
    const name = data.address?.country?.trim() ?? '';
    const code = (data.address?.country_code ?? '').trim().toUpperCase();
    return { name, code };
  } catch {
    return { name: '', code: '' };
  }
}