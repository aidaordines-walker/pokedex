const BASE_URL = "http://127.0.0.1:4000/api";

export async function searchCards(name) {
  const res = await fetch(
    `${BASE_URL}/card?name=${encodeURIComponent(name)}`
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}