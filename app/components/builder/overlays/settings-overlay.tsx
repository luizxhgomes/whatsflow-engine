"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AccountSettings } from "@/components/builder/settings/account-settings";
import { Spinner } from "@/components/builder/ui/spinner";
import { api } from "@/lib/builder/api-client";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";

type SettingsOverlayProps = {
  overlayId: string;
};

export function SettingsOverlay({ overlayId }: SettingsOverlayProps) {
  const { closeAll } = useOverlay();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Account state
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");

  const loadAccount = useCallback(async () => {
    try {
      const data = await api.user.get();
      setAccountName(data.name || "");
      setAccountEmail(data.email || "");
    } catch (error) {
      console.error("Failed to load account:", error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await loadAccount();
    } finally {
      setLoading(false);
    }
  }, [loadAccount]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveAccount = async () => {
    try {
      setSaving(true);
      await api.user.update({ name: accountName, email: accountEmail });
      await loadAccount();
      toast.success("Configurações salvas");
      closeAll();
    } catch (error) {
      console.error("Failed to save account:", error);
      toast.error("Falha ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay
      actions={[
        { label: "Cancelar", variant: "outline", onClick: closeAll },
        {
          label: "Salvar",
          onClick: saveAccount,
          loading: saving,
          disabled: loading,
        },
      ]}
      overlayId={overlayId}
      title="Configurações"
    >
      <p className="-mt-2 mb-4 text-muted-foreground text-sm">
        Atualize seus dados pessoais
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <AccountSettings
          accountEmail={accountEmail}
          accountName={accountName}
          onEmailChange={setAccountEmail}
          onNameChange={setAccountName}
        />
      )}
    </Overlay>
  );
}
