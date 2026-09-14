import { createClient } from "@/lib/supabase/server";
import {
  ElevenlabsCredentialForm,
  ImageCredentialForm,
  LlmCredentialForm,
} from "@/components/credential-forms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: credentials } = await supabase
    .from("api_credentials")
    .select("*")
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Suas chaves de API ficam cifradas no banco (Supabase Vault) e só o
          worker consegue lê-las — o frontend nunca mostra o valor salvo de
          volta.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LlmCredentialForm
          initialProvider={credentials?.llm_provider ?? "moonshot"}
          initialModel={credentials?.llm_model ?? ""}
          initialBaseUrl={credentials?.llm_base_url ?? ""}
          configured={Boolean(credentials?.llm_api_key_secret_id)}
        />
        <ImageCredentialForm
          initialBaseUrl={credentials?.image_base_url ?? ""}
          initialModel={credentials?.image_model ?? ""}
          configured={Boolean(credentials?.image_api_key_secret_id)}
        />
        <ElevenlabsCredentialForm
          configured={Boolean(credentials?.elevenlabs_api_key_secret_id)}
        />
      </div>
    </div>
  );
}
