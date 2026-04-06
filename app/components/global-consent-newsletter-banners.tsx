"use client";

import { useEffect, useState } from "react";
import StorageConsentBanner from "./storage-consent-banner";
import FoundingMembersInfoBanner from "./founding-members-info-banner";
import { clearOptionalStorageData, getStorageConsentChoice, setStorageConsentChoice } from "../lib/storage-consent";

export default function GlobalConsentNewsletterBanners() {
  const [storageOpen, setStorageOpen] = useState(false);

  useEffect(() => {
    const consent = getStorageConsentChoice();
    setStorageOpen(!consent);
  }, []);

  const acceptAll = () => {
    setStorageConsentChoice("accepted");
    setStorageOpen(false);
  };

  const necessaryOnly = () => {
    setStorageConsentChoice("necessary");
    clearOptionalStorageData();
    setStorageOpen(false);
  };

  return (
    <>
      <StorageConsentBanner open={storageOpen} onAcceptAll={acceptAll} onNecessaryOnly={necessaryOnly} />
      <FoundingMembersInfoBanner />
    </>
  );
}
