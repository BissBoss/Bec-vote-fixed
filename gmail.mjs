// Gmail aliases share one voting identity (dots and +tags do not add votes).
export function gmailIdentity(value) {
  const email = String(value || "").trim().toLowerCase();
  const match = /^([a-z0-9]+(?:\.[a-z0-9]+)*(?:\+[a-z0-9._-]+)?)@(gmail\.com|googlemail\.com)$/.exec(email);
  if (!match) return null;
  const local = match[1].split("+")[0].replaceAll(".", "");
  if (local.length < 6 || local.length > 30) return null;
  return `${local}@gmail.com`;
}
