import { supabase } from "./supabase.js";

function currentDestination() {
  return `${window.location.pathname}${window.location.search}`;
}

export async function requireAuthenticatedUser() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    const next = encodeURIComponent(currentDestination());
    window.location.replace(`/login.html?next=${next}`);
    return null;
  }

  return user;
}
