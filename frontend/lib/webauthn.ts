import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { api } from "./api";

export async function registerPasskey(email: string, displayName: string) {
  const { challenge_id, public_key_options } = await api.post<{
    challenge_id: string;
    public_key_options: Record<string, unknown>;
    user: { id: string; email: string; display_name: string };
  }>("/auth/register/start", { email, display_name });

  const credential = await startRegistration({ optionsJSON: public_key_options });

  await api.post("/auth/register/complete", {
    challenge_id,
    credential: { ...credential, device_name: displayName },
  });
}

export async function loginWithPasskey(email: string) {
  const { challenge_id, public_key_options } = await api.post<{
    challenge_id: string;
    public_key_options: Record<string, unknown>;
  }>("/auth/login/start", { email });

  const credential = await startAuthentication({ optionsJSON: public_key_options });

  const result = await api.post<{
    access_token: string;
    refresh_token: string;
    user: { id: string; email: string; display_name: string };
  }>("/auth/login/complete", { challenge_id, credential });

  localStorage.setItem("access_token", result.access_token);
  localStorage.setItem("refresh_token", result.refresh_token);
  return result.user;
}
