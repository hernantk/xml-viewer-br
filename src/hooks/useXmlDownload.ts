import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface UserCertificate {
  thumbprint: string;
  subject: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  hasPrivateKey: boolean;
}

export function normalizeAccessKey(value: string): string {
  return value.replace(/\D/g, "");
}

export function getCertificateName(certificate: UserCertificate): string {
  const commonName = certificate.subject.match(/CN=([^,]+)/i)?.[1];
  return commonName || certificate.subject || certificate.thumbprint;
}

export function useXmlDownload(open: boolean) {
  const [certificates, setCertificates] = useState<UserCertificate[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCertificates = useCallback(async () => {
    setLoadingCertificates(true);
    setError(null);

    try {
      const result = await invoke<UserCertificate[]>("list_user_certificates");
      setCertificates(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setCertificates([]);
    } finally {
      setLoadingCertificates(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadCertificates();
  }, [loadCertificates, open]);

  const openDownloadWindow = useCallback(
    async (accessKey: string, certificateThumbprint: string) => {
      const normalizedKey = normalizeAccessKey(accessKey);
      if (normalizedKey.length !== 44) {
        setError("Informe uma chave de acesso de NF-e com 44 dígitos.");
        return false;
      }

      if (!certificateThumbprint) {
        setError("Selecione um certificado digital.");
        return false;
      }

      setOpening(true);
      setError(null);

      try {
        await invoke("open_nfe_download_window", {
          accessKey: normalizedKey,
          certificateThumbprint,
        });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      } finally {
        setOpening(false);
      }
    },
    [],
  );

  const closeDownloadWindow = useCallback(async () => {
    try {
      await invoke("close_nfe_download_window");
    } catch {
      /* Window may already be closed. */
    }
  }, []);

  return {
    certificates,
    loadingCertificates,
    opening,
    error,
    loadCertificates,
    closeDownloadWindow,
    openDownloadWindow,
  };
}
